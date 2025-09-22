use image::{DynamicImage, ImageBuffer, Luma, Rgb};
// use imageproc::filter::median_filter;
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

// #[wasm_bindgen]
// pub fn median_blur_image(img: &mut Image, kernel_radius: u32) -> Result<(), JsValue> {
//     if kernel_radius == 0 {
//         return Err(JsValue::from_str("Kernel radius must be positive"));
//     }

//     match &mut img.pixels {
//         Pixels::U8(data) => match img.color_type.as_str() {
//             "Rgb8" => {
//                 let buffer: ImageBuffer<Rgb<u8>, _> =
//                     ImageBuffer::from_raw(img.horizontal_length, img.vertical_length, data.clone())
//                         .ok_or_else(|| JsValue::from_str("Failed to build Rgb8 buffer"))?;

//                 let filtered = median_filter(&buffer, kernel_radius, kernel_radius);
//                 *data = filtered.into_raw(); // overwrite original pixels
//             }
//             "Luma8" => {
//                 let buffer: ImageBuffer<Luma<u8>, _> =
//                     ImageBuffer::from_raw(img.horizontal_length, img.vertical_length, data.clone())
//                         .ok_or_else(|| JsValue::from_str("Failed to build Luma8 buffer"))?;

//                 let filtered = median_filter(&buffer, kernel_radius, kernel_radius);
//                 *data = filtered.into_raw();
//             }
//             _ => return Err(JsValue::from_str("Unsupported 8-bit color type")),
//         },
//         Pixels::U16(data) => match img.color_type.as_str() {
//             "Luma16" => {
//                 let buffer: ImageBuffer<Luma<u16>, _> =
//                     ImageBuffer::from_raw(img.horizontal_length, img.vertical_length, data.clone())
//                         .ok_or_else(|| JsValue::from_str("Failed to build Luma16 buffer"))?;

//                 let filtered = median_filter(&buffer, kernel_radius, kernel_radius);
//                 *data = filtered.into_raw();
//             }
//             _ => return Err(JsValue::from_str("Unsupported 16-bit color type")),
//         },
//     };

//     Ok(())
// }
