use image::{DynamicImage, ImageBuffer, Luma, Rgb};
use wasm_bindgen::prelude::*;

use crate::image_handler::{Image, Pixels};

#[wasm_bindgen]
pub fn gaussian_blur_image(img: &mut Image, sigma: f32) -> Result<(), JsValue> {
    if sigma <= 0.0 {
        return Err(JsValue::from_str("Sigma must be positive"));
    }

    // Conversion to DynamicImage to use image crate's blur. This requires wrapping pixel vector in
    // an ImageBuffer first, and then converting that to DynamicImage.
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
