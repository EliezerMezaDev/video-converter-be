const { z } = require('zod');

const OUTPUT_FORMATS = ['webp', 'avif', 'png', 'jpeg'];

const uploadSchema = z.object({
  socketId: z.string().min(1, 'socketId es requerido'),
  format: z.enum(OUTPUT_FORMATS, {
    error: `Formato de salida inválido. Opciones: ${OUTPUT_FORMATS.join(', ')}`,
  }),
});

module.exports = { uploadSchema, OUTPUT_FORMATS };
