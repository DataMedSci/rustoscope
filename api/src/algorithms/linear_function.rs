use wasm_bindgen::prelude::*;

use crate::image_handler::{Image, Pixels};

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
