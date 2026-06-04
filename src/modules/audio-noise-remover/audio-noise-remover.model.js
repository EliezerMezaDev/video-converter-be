const { z } = require('zod');

const uploadSchema = z.object({
  socketId: z.string().min(1, 'socketId es requerido'),
});

module.exports = { uploadSchema };
