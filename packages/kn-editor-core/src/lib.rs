//! kn-editor-core — Rope-based text core for Knowledge Network editor
//!
//! Build targets:
//! - Native (rlib) for testing
//! - WASM (cdylib) for browser integration via wasm-bindgen

use wasm_bindgen::prelude::*;

#[cfg(feature = "rope")]
use ropey::Rope;

#[wasm_bindgen]
pub struct CoreText {
    #[cfg(feature = "rope")]
    rope: Rope,
    #[cfg(not(feature = "rope"))]
    rope: String,
}

#[wasm_bindgen]
impl CoreText {
    #[wasm_bindgen(constructor)]
    pub fn new() -> CoreText {
        #[cfg(feature = "rope")]
        {
            CoreText { rope: Rope::new() }
        }
        #[cfg(not(feature = "rope"))]
        {
            CoreText { rope: String::new() }
        }
    }

    #[wasm_bindgen(js_name = fromString)]
    pub fn from_string(s: &str) -> CoreText {
        #[cfg(feature = "rope")]
        {
            CoreText { rope: Rope::from_str(s) }
        }
        #[cfg(not(feature = "rope"))]
        {
            CoreText { rope: s.to_string() }
        }
    }

    #[wasm_bindgen(js_name = lenChars)]
    pub fn len_chars(&self) -> usize {
        #[cfg(feature = "rope")]
        { self.rope.len_chars() }
        #[cfg(not(feature = "rope"))]
        { self.rope.chars().count() }
    }

    #[wasm_bindgen(js_name = insert)]
    pub fn insert(&mut self, char_idx: usize, text: &str) {
        #[cfg(feature = "rope")]
        {
            self.rope.insert(char_idx, text);
        }
        #[cfg(not(feature = "rope"))]
        {
            let mut acc = String::with_capacity(self.rope.len() + text.len());
            let (head, tail) = self.rope.split_at(self.byte_index(char_idx));
            acc.push_str(head);
            acc.push_str(text);
            acc.push_str(tail);
            self.rope = acc;
        }
    }

    #[wasm_bindgen(js_name = delete)]
    pub fn delete(&mut self, char_idx: usize, len_chars: usize) {
        #[cfg(feature = "rope")]
        {
            let end = char_idx.saturating_add(len_chars);
            self.rope.remove(char_idx..end);
        }
        #[cfg(not(feature = "rope"))]
        {
            let start_b = self.byte_index(char_idx);
            let end_b = self.byte_index(char_idx.saturating_add(len_chars));
            self.rope.replace_range(start_b..end_b, "");
        }
    }

    #[wasm_bindgen(js_name = slice)]
    pub fn slice(&self, start_char: usize, end_char: usize) -> String {
        #[cfg(feature = "rope")]
        {
            self.rope.slice(start_char..end_char).to_string()
        }
        #[cfg(not(feature = "rope"))]
        {
            let sb = self.byte_index(start_char);
            let eb = self.byte_index(end_char);
            self.rope[sb..eb].to_string()
        }
    }

    #[cfg(not(feature = "rope"))]
    fn byte_index(&self, char_idx: usize) -> usize {
        // Fallback: convert char index to byte index (UTF-8)
        self.rope.char_indices().nth(char_idx).map(|(i, _)| i).unwrap_or(self.rope.len())
    }
}

#[wasm_bindgen]
pub fn version() -> String { "kn-editor-core/0.1.0".to_string() }

