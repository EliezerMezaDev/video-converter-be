const { z } = require('zod');

const STRENGTH_LEVELS = ['soft', 'medium', 'strong'];

const uploadSchema = z.object({
  socketId: z.string().min(1, 'socketId es requerido'),
  strength: z.enum(STRENGTH_LEVELS, {
    error: `Intensidad inválida. Opciones: ${STRENGTH_LEVELS.join(', ')}`,
  }),
});

module.exports = { uploadSchema, STRENGTH_LEVELS };
