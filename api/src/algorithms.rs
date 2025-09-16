use image::{DynamicImage, ImageBuffer, Luma, Rgb};
use imageproc::filter::median_filter;
use std::io::Cursor;
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
pub fn median_blur_image(img: &mut Image, kernel_radius: u32) -> Result<(), JsValue> {
    if kernel_radius == 0 {
        return Err(JsValue::from_str("Kernel radius must be positive"));
    }

    match &mut img.pixels {
        Pixels::U8(data) => match img.color_type.as_str() {
            "Rgb8" => {
                let buffer: ImageBuffer<Rgb<u8>, _> =
                    ImageBuffer::from_raw(img.horizontal_length, img.vertical_length, data.clone())
                        .ok_or_else(|| JsValue::from_str("Failed to build Rgb8 buffer"))?;

                let filtered = median_filter(&buffer, kernel_radius, kernel_radius);
                *data = filtered.into_raw(); // overwrite original pixels
            }
            "Luma8" => {
                let buffer: ImageBuffer<Luma<u8>, _> =
                    ImageBuffer::from_raw(img.horizontal_length, img.vertical_length, data.clone())
                        .ok_or_else(|| JsValue::from_str("Failed to build Luma8 buffer"))?;

                let filtered = median_filter(&buffer, kernel_radius, kernel_radius);
                *data = filtered.into_raw();
            }
            _ => return Err(JsValue::from_str("Unsupported 8-bit color type")),
        },
        Pixels::U16(data) => match img.color_type.as_str() {
            "Luma16" => {
                let buffer: ImageBuffer<Luma<u16>, _> =
                    ImageBuffer::from_raw(img.horizontal_length, img.vertical_length, data.clone())
                        .ok_or_else(|| JsValue::from_str("Failed to build Luma16 buffer"))?;

                let filtered = median_filter(&buffer, kernel_radius, kernel_radius);
                *data = filtered.into_raw();
            }
            _ => return Err(JsValue::from_str("Unsupported 16-bit color type")),
        },
    };

    Ok(())
}
