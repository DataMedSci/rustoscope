use image::{DynamicImage, ImageBuffer, ImageError, ImageOutputFormat, Rgb};
use imageproc::filter::median_filter;
use std::io::Cursor;
use wasm_bindgen::prelude::*;

pub mod algorithms;
pub mod image_handler;

// Functions used in the client code

#[wasm_bindgen]
pub fn to_grayscale(image: &[u8]) -> Result<Vec<u8>, JsValue> {
    read_and_encode(image, |img| img.grayscale())
}

#[wasm_bindgen]
pub fn invert_colors(image: &[u8]) -> Result<Vec<u8>, JsValue> {
    read_and_encode(image, |mut img| {
        img.invert();
        img
    })
}

#[wasm_bindgen]
pub fn clip_pixels_with_percentiles(
    image_data: &[u8],
    low_percentile: Option<f32>,
    high_percentile: Option<f32>,
) -> Result<Vec<u8>, JsValue> {
    if let Some(lp) = low_percentile {
        if lp < 0.0 || lp > 100.0 {
            return Err(JsValue::from_str("Percentile must be between 0 and 100"));
        }
    }
    if let Some(hp) = high_percentile {
        if hp < 0.0 || hp > 100.0 {
            return Err(JsValue::from_str("Percentile must be between 0 and 100"));
        }
    }

    if let (Some(lp), Some(hp)) = (low_percentile, high_percentile) {
        if lp > hp {
            return Err(JsValue::from_str(
                "low_percentile must be <= high_percentile",
            ));
        }
    }

    let img = image::load_from_memory(image_data)
        .map_err(|e| JsValue::from_str(&format!("Image decode error: {}", e)))?;

    let rgb8: image::RgbImage = img.to_rgb8();
    let (horizontal_length, vertical_length) = rgb8.dimensions();
    let mut pixels: Vec<u8> = rgb8.into_raw();

    if low_percentile.is_none() && high_percentile.is_none() {
        let buf: ImageBuffer<Rgb<u8>, Vec<u8>> =
            ImageBuffer::from_raw(horizontal_length, vertical_length, pixels.clone())
                .ok_or_else(|| JsValue::from_str("Buffer length mismatch"))?;
        let dyn_img = DynamicImage::ImageRgb8(buf);
        let mut out = Cursor::new(Vec::new());
        dyn_img
            .write_to(&mut out, ImageOutputFormat::Png)
            .map_err(|e| JsValue::from_str(&format!("PNG encode error: {}", e)))?;
        return Ok(out.into_inner());
    }

    let mut flat_for_low: Vec<u8> = pixels.clone();
    let mut flat_for_high: Vec<u8> = pixels.clone();

    // Compute low_cutoff and high_cutoff
    let low_cutoff: Option<u8> = percentile_cutoff(&mut flat_for_low, low_percentile);
    let high_cutoff: Option<u8> = percentile_cutoff(&mut flat_for_high, high_percentile);

    let low_val: u8 = low_cutoff.unwrap_or(0);
    let high_val: u8 = high_cutoff.unwrap_or(255);

    pixels.iter_mut().for_each(|channel_byte| {
        if *channel_byte < low_val {
            *channel_byte = low_val;
        } else if *channel_byte > high_val {
            *channel_byte = high_val;
        }
    });

    let clip_buf: ImageBuffer<Rgb<u8>, Vec<u8>> =
        ImageBuffer::from_raw(horizontal_length, vertical_length, pixels)
            .ok_or_else(|| JsValue::from_str("Buffer length mismatch after clipping"))?;
    let dyn_img = DynamicImage::ImageRgb8(clip_buf);

    let mut output = Cursor::new(Vec::new());
    dyn_img
        .write_to(&mut output, ImageOutputFormat::Png)
        .map_err(|e| JsValue::from_str(&format!("PNG encode error: {}", e)))?;
    Ok(output.into_inner())
}

// Helpers

fn percentile_cutoff(flat_pixels: &mut [u8], pct: Option<f32>) -> Option<u8> {
    if let Some(p) = pct {
        let p = if p < 0.0 {
            0.0
        } else if p > 100.0 {
            100.0
        } else {
            p
        };

        let total = flat_pixels.len();
        if total == 0 {
            return None;
        }
        let idx_f = (p / 100.0) * (total as f32);
        let mut idx = idx_f.floor() as usize;
        if idx >= total {
            idx = total - 1;
        }

        flat_pixels.select_nth_unstable(idx);

        return Some(flat_pixels[idx]);
    }

    // If pct == None, no cutoff on that side:
    None
}

fn read_and_encode(
    image_bytes: &[u8],
    mut transform: impl FnMut(DynamicImage) -> DynamicImage,
) -> Result<Vec<u8>, JsValue> {
    let img = image::load_from_memory(image_bytes).map_err(generate_error_message)?;
    let img = transform(img);

    let mut buf = Cursor::new(Vec::new());
    img.write_to(&mut buf, ImageOutputFormat::Png).unwrap();

    Ok(buf.into_inner())
}

#[wasm_bindgen]
pub fn gaussian_blur(image: &[u8], sigma: f32) -> Result<Vec<u8>, JsValue> {
    if sigma <= 0.0 {
        return Err(JsValue::from_str("Sigma must be positive"));
    }

    let img = image::load_from_memory(image)
        .map_err(|e| JsValue::from_str(&format!("Image decode error: {}", e)))?;

    let blurred = img.blur(sigma);

    let mut buf = Cursor::new(Vec::new());
    blurred
        .write_to(&mut buf, ImageOutputFormat::Png)
        .map_err(|e| JsValue::from_str(&format!("PNG encode error: {}", e)))?;

    Ok(buf.into_inner())
}

#[wasm_bindgen]
pub fn median_blur(image: &[u8], kernel_radius: u32) -> Result<Vec<u8>, JsValue> {
    if kernel_radius == 0 {
        return Err(JsValue::from_str("Kernel radius must be positive"));
    }

    let img = image::load_from_memory(image)
        .map_err(|e| JsValue::from_str(&format!("Image decode error: {}", e)))?;
    let rgb = img.to_rgb8();

    let filtered = median_filter(&rgb, kernel_radius, kernel_radius);

    let mut buf = Cursor::new(Vec::new());
    DynamicImage::ImageRgb8(filtered)
        .write_to(&mut buf, ImageOutputFormat::Png)
        .map_err(|e| JsValue::from_str(&format!("PNG encode error: {}", e)))?;

    Ok(buf.into_inner())
}

fn generate_error_message(err: ImageError) -> JsValue {
    JsValue::from_str(&format!("Image processing error: {}", err))
}
