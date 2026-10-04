/** Tipos de proveedor de IA admitidos (uso en servidor y en la interfaz). */
export const TIPOS_IA = {
  anthropic: {
    nombre: 'Anthropic (Claude)',
    descripcion: 'Modelos Claude. Única opción con búsqueda de jurisprudencia en fuentes oficiales.',
    baseUrl: 'https://api.anthropic.com',
    baseEditable: false,
    requiereClave: true,
    modeloSugerido: 'claude-opus-5-5',
    ayudaClave: 'console.anthropic.com → API Keys',
  },
  openai: {
    nombre: 'OpenAI',
    descripcion: 'Modelos de OpenAI mediante su API.',
    baseUrl: 'https://api.openai.com/v1',
    baseEditable: false,
    requiereClave: true,
    modeloSugerido: '',
    ayudaClave: 'platform.openai.com → API keys',
  },
  gemini: {
    nombre: 'Google Gemini',
    descripcion: 'Modelos Gemini mediante la API de Google AI Studio.',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    baseEditable: false,
    requiereClave: true,
    modeloSugerido: '',
    ayudaClave: 'aistudio.google.com → Get API key',
  },
  compatible: {
    nombre: 'Otro servicio compatible',
    descripcion: 'Cualquier servicio con API compatible con OpenAI (OpenRouter, Groq, DeepSeek, Mistral, etc.).',
    baseUrl: '',
    baseEditable: true,
    requiereClave: true,
    modeloSugerido: '',
    ayudaClave: 'en el panel del proveedor',
  },
  local: {
    nombre: 'IA local',
    descripcion: 'Modelo en su propia computadora o red (Ollama, LM Studio). Sin costo por consulta; los textos no salen de su red.',
    baseUrl: 'http://localhost:11434/v1',
    baseEditable: true,
    requiereClave: false,
    modeloSugerido: '',
    ayudaClave: 'normalmente no requiere clave',
  },
} as const;

export type TipoIA = keyof typeof TIPOS_IA;
export const esTipoIA = (v: unknown): v is TipoIA => typeof v === 'string' && v in TIPOS_IA;

/** Proveedor visible para un usuario (sin la clave). */
export type ProveedorDisponible = { id: string; nombre: string; tipo: TipoIA; modelo: string; predeterminado: boolean };
