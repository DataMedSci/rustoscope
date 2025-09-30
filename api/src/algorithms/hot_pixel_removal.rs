use wasm_bindgen::prelude::*;

use crate::image_handler::{Image, Pixels};

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
