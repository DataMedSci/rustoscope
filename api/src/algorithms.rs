use image::{DynamicImage, ImageBuffer, Luma, Rgb};
use wasm_bindgen::prelude::*;

use crate::image_handler::{Image, Pixels};

#[wasm_bindgen]
pub fn gaussian_blur_image(img: &mut Image, sigma: f32) -> Result<(), JsValue> {
    if sigma <= 0.0 {
        return Err(JsValue::from_str("Sigma must be positive"));
    }

    // Convert Image struct into DynamicImage
    let dyn_img: DynamicImage = match &img.pixels {
        Pixels::U8(data) => match img.color_type.as_str() {
            "Rgb8" => {
                let buffer: ImageBuffer<Rgb<u8>, _> =
                    ImageBuffer::from_raw(img.horizontal_length, img.vertical_length, data.clone())
                        .ok_or_else(|| JsValue::from_str("Failed to build Rgb8 buffer"))?;
                DynamicImage::ImageRgb8(buffer)
            }
            "Luma8" => {
                let buffer: ImageBuffer<Luma<u8>, _> =
                    ImageBuffer::from_raw(img.horizontal_length, img.vertical_length, data.clone())
                        .ok_or_else(|| JsValue::from_str("Failed to build Luma8 buffer"))?;
                DynamicImage::ImageLuma8(buffer)
            }
            _ => return Err(JsValue::from_str("Unsupported 8-bit color type")),
        },
        Pixels::U16(data) => match img.color_type.as_str() {
            "Luma16" => {
                let buffer: ImageBuffer<Luma<u16>, _> =
                    ImageBuffer::from_raw(img.horizontal_length, img.vertical_length, data.clone())
                        .ok_or_else(|| JsValue::from_str("Failed to build Luma16 buffer"))?;
                DynamicImage::ImageLuma16(buffer)
            }
            _ => return Err(JsValue::from_str("Unsupported 16-bit color type")),
        },
    };

    // Apply gaussian blur
    let blurred = dyn_img.blur(sigma);

    // Write blurred pixels back into the same Image
    match &mut img.pixels {
        Pixels::U8(data) => {
            *data = match blurred {
                DynamicImage::ImageRgb8(buf) => buf.into_raw(),
                DynamicImage::ImageLuma8(buf) => buf.into_raw(),
                _ => return Err(JsValue::from_str("Unexpected blurred format for U8")),
            };
        }
        Pixels::U16(data) => {
            *data = match blurred {
                DynamicImage::ImageLuma16(buf) => buf.into_raw(),
                _ => return Err(JsValue::from_str("Unexpected blurred format for U16")),
            };
        }
    }

    Ok(())
}

#[wasm_bindgen]
pub fn clip_pixels_with_percentiles(
    img: &mut Image,
    low_percentile: Option<f32>,
    high_percentile: Option<f32>,
) -> Result<(), JsValue> {
    // ---- 1. Validate inputs ----
    if let Some(lp) = low_percentile {
        if lp < 0.0 || lp > 100.0 {
            return Err(JsValue::from_str(
                "low_percentile must be between 0 and 100",
            ));
        }
    }
    if let Some(hp) = high_percentile {
        if hp < 0.0 || hp > 100.0 {
            return Err(JsValue::from_str(
                "high_percentile must be between 0 and 100",
            ));
        }
    }
    if let (Some(lp), Some(hp)) = (low_percentile, high_percentile) {
        if lp > hp {
            return Err(JsValue::from_str(
                "low_percentile must be <= high_percentile",
            ));
        }
    }

    // ---- 2. Mutate pixels depending on storage type ----
    match &mut img.pixels {
        Pixels::U8(data) => {
            if data.is_empty() {
                return Err(JsValue::from_str("Image has no pixel data"));
            }

            // Compute cutoffs
            let low_cutoff = percentile_cutoff_u8(&mut data.clone(), low_percentile);
            let high_cutoff = percentile_cutoff_u8(&mut data.clone(), high_percentile);

            let low_val: u8 = low_cutoff.unwrap_or(0);
            let high_val: u8 = high_cutoff.unwrap_or(255);

            // Clip in place
            data.iter_mut().for_each(|v| {
                if *v < low_val {
                    *v = low_val;
                } else if *v > high_val {
                    *v = high_val;
                }
            });
        }

        Pixels::U16(data) => {
            if data.is_empty() {
                return Err(JsValue::from_str("Image has no pixel data"));
            }

            // Compute cutoffs
            let low_cutoff = percentile_cutoff_u16(&mut data.clone(), low_percentile);
            let high_cutoff = percentile_cutoff_u16(&mut data.clone(), high_percentile);

            let low_val: u16 = low_cutoff.unwrap_or(0);
            let high_val: u16 = high_cutoff.unwrap_or(u16::MAX);

            // Clip in place
            data.iter_mut().for_each(|v| {
                if *v < low_val {
                    *v = low_val;
                } else if *v > high_val {
                    *v = high_val;
                }
            });
        }
    }

    Ok(())
}

#[wasm_bindgen]
pub fn apply_linear_function(img: &mut Image, a: f32, b: f32) -> Result<(), JsValue> {
    match &mut img.pixels {
        Pixels::U8(data) => {
            for v in data.iter_mut() {
                let new_val = (a * (*v as f32) + b).round();
                *v = new_val.clamp(0.0, 255.0) as u8;
            }
        }
        Pixels::U16(data) => {
            for v in data.iter_mut() {
                let new_val = (a * (*v as f32) + b).round();
                *v = new_val.clamp(0.0, 65535.0) as u16;
            }
        }
    }
    Ok(())
}

// ---- Helpers ----

// For 8-bit data
fn percentile_cutoff_u8(flat_pixels: &mut [u8], pct: Option<f32>) -> Option<u8> {
    pct.map(|p| {
        let p = p.clamp(0.0, 100.0);
        let total = flat_pixels.len();
        if total == 0 {
            return 0;
        }
        let idx_f = (p / 100.0) * (total as f32);
        let mut idx = idx_f.floor() as usize;
        if idx >= total {
            idx = total - 1;
        }

        flat_pixels.select_nth_unstable(idx);
        flat_pixels[idx]
    })
}

// For 16-bit data
fn percentile_cutoff_u16(flat_pixels: &mut [u16], pct: Option<f32>) -> Option<u16> {
    pct.map(|p| {
        let p = p.clamp(0.0, 100.0);
        let total = flat_pixels.len();
        if total == 0 {
            return 0;
        }
        let idx_f = (p / 100.0) * (total as f32);
        let mut idx = idx_f.floor() as usize;
        if idx >= total {
            idx = total - 1;
        }

        flat_pixels.select_nth_unstable(idx);
        flat_pixels[idx]
    })
}

// Simple helper to get median from histogram
fn median_from_histogram_u8(hist: &[u32], window_size: usize) -> u8 {
    let mut count = 0;
    let mid = window_size / 2 + 1;
    for (i, &c) in hist.iter().enumerate() {
        count += c;
        if count >= mid as u32 {
            return i as u8;
        }
    }
    0
}

fn median_from_histogram_u16(hist: &[u32], window_size: usize) -> u16 {
    let mut count = 0;
    let mid = window_size / 2 + 1;
    for (i, &c) in hist.iter().enumerate() {
        count += c;
        if count >= mid as u32 {
            return i as u16;
        }
    }
    0
}

#[wasm_bindgen]
pub fn median_blur_image(img: &mut Image, kernel_radius: u32) -> Result<(), JsValue> {
    if kernel_radius == 0 {
        return Err(JsValue::from_str("Kernel radius must be positive"));
    }

    let width = img.horizontal_length as usize;
    let height = img.vertical_length as usize;
    let window_size = ((2 * kernel_radius + 1) * (2 * kernel_radius + 1)) as usize;

    match &mut img.pixels {
        Pixels::U8(data) => match img.color_type.as_str() {
            "Luma8" => {
                let mut output = vec![0u8; data.len()];
                let mut hist = [0u32; 256];

                for y in 0..height {
                    for x in 0..width {
                        hist.fill(0);
                        for ky in y.saturating_sub(kernel_radius as usize)
                            ..=(y + kernel_radius as usize).min(height - 1)
                        {
                            for kx in x.saturating_sub(kernel_radius as usize)
                                ..=(x + kernel_radius as usize).min(width - 1)
                            {
                                hist[data[ky * width + kx] as usize] += 1;
                            }
                        }
                        output[y * width + x] = median_from_histogram_u8(&hist, window_size);
                    }
                }
                *data = output;
            }
            "Rgb8" => {
                let mut output = vec![0u8; data.len()];
                let channels = 3;
                let stride = width * channels;
                let mut hist = [0u32; 256];

                for y in 0..height {
                    for x in 0..width {
                        for c in 0..channels {
                            hist.fill(0);
                            for ky in y.saturating_sub(kernel_radius as usize)
                                ..=(y + kernel_radius as usize).min(height - 1)
                            {
                                for kx in x.saturating_sub(kernel_radius as usize)
                                    ..=(x + kernel_radius as usize).min(width - 1)
                                {
                                    hist[data[ky * stride + kx * channels + c] as usize] += 1;
                                }
                            }
                            output[y * stride + x * channels + c] =
                                median_from_histogram_u8(&hist, window_size);
                        }
                    }
                }
                *data = output;
            }
            _ => return Err(JsValue::from_str("Unsupported 8-bit color type")),
        },
        Pixels::U16(data) => {
            match img.color_type.as_str() {
                "Luma16" => {
                    let mut output = vec![0u16; data.len()];
                    let mut hist = vec![0u32; 65536]; // 0..65535

                    for y in 0..height {
                        for x in 0..width {
                            hist.fill(0);
                            for ky in y.saturating_sub(kernel_radius as usize)
                                ..=(y + kernel_radius as usize).min(height - 1)
                            {
                                for kx in x.saturating_sub(kernel_radius as usize)
                                    ..=(x + kernel_radius as usize).min(width - 1)
                                {
                                    hist[data[ky * width + kx] as usize] += 1;
                                }
                            }
                            output[y * width + x] = median_from_histogram_u16(&hist, window_size);
                        }
                    }
                    *data = output;
                }
                _ => return Err(JsValue::from_str("Unsupported 16-bit color type")),
            }
        }
    }

    Ok(())
}
