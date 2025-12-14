use image::{DynamicImage, ImageFormat};
use imageproc::filter::median_filter;
use std::io::Cursor;
use wasm_bindgen::prelude::*;

pub mod algorithms;
pub mod image_handler;

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
        .write_to(&mut buf, ImageFormat::Png)
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
        .write_to(&mut buf, ImageFormat::Png)
        .map_err(|e| JsValue::from_str(&format!("PNG encode error: {}", e)))?;

    Ok(buf.into_inner())
}
