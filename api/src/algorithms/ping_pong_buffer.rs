/// Simple ping-pong buffers that holds two Vec<T> of equal capacity (image size).
pub struct PingPongBuffers<T> {
    pub active: Vec<T>,
    pub scratch: Vec<T>,
    pub width: usize,
    pub height: usize,
    pub channels: usize,
}

impl<T: Default + Clone> PingPongBuffers<T> {
    pub fn new(width: usize, height: usize, channels: usize) -> Self {
        let size = width * height * channels;
        Self {
            active: vec![T::default(); size],
            scratch: vec![T::default(); size],
            width,
            height,
            channels,
        }
    }

    /// swap pointers to active and scratch buffers
    pub fn swap(&mut self) {
        std::mem::swap(&mut self.active, &mut self.scratch);
    }

    pub fn len(&self) -> usize {
        self.active.len()
    }

    pub fn active_slice(&self) -> &[T] {
        &self.active
    }

    pub fn active_slice_mut(&mut self) -> &mut [T] {
        &mut self.active
    }

    pub fn scratch_slice_mut(&mut self) -> &mut [T] {
        &mut self.scratch
    }
}
