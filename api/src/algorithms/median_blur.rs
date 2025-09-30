use wasm_bindgen::prelude::*;

use crate::image_handler::{Image, Pixels};

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
