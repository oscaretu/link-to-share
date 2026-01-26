/**
 * PreviewCard.tsx - Componente de previsualización y edición de enlaces
 *
 * Este componente muestra una tarjeta con los datos extraídos de un enlace:
 * - Imagen destacada (si existe)
 * - Título del artículo/página
 * - Autor (si existe)
 * - Descripción
 * - URL del enlace
 *
 * Funcionalidades principales:
 * 1. Visualización: Muestra los datos en un formato de tarjeta atractivo
 * 2. Edición: Permite editar título, descripción y URL manualmente
 * 3. Formato: Selector para elegir formato WhatsApp (*bold*) o Telegram (**bold**)
 * 4. Copia: Botón para copiar el texto formateado al portapapeles
 *
 * El componente usa 'use client' porque necesita:
 * - useState para manejar estados locales
 * - useEffect para sincronizar props con estado
 * - navigator.clipboard para copiar al portapapeles
 */

'use client';

import { useState, useEffect } from 'react';

/**
 * Interfaz que define las props que recibe el componente.
 *
 * @property title - Título del enlace (obligatorio)
 * @property description - Descripción del enlace (obligatorio, puede ser string vacío)
 * @property image - URL de la imagen destacada (null si no hay imagen)
 * @property url - URL del enlace original (obligatorio)
 * @property author - Autor o marca del contenido (null si no se encontró)
 * @property onEdit - Callback que se ejecuta cuando el usuario guarda ediciones
 */
interface PreviewCardProps {
  title: string;
  description: string;
  image: string | null;
  url: string;
  author: string | null;
  onEdit: (data: { title: string; description: string; url: string }) => void;
}

/**
 * Tipo para el formato de salida del texto.
 * - 'whatsapp': Usa asteriscos simples para negrita (*texto*)
 * - 'telegram': Usa asteriscos dobles para negrita (**texto**)
 */
type FormatType = 'whatsapp' | 'telegram';

/**
 * Componente PreviewCard - Tarjeta de previsualización con edición inline
 *
 * Este componente tiene dos modos:
 * 1. Modo visualización (isEditing = false): Muestra los datos y permite copiar
 * 2. Modo edición (isEditing = true): Muestra formulario para editar los campos
 *
 * @param props - Props definidas en PreviewCardProps
 * @returns JSX del componente
 */
export default function PreviewCard({
  title,
  description,
  image,
  url,
  author,
  onEdit,
}: PreviewCardProps) {
  // ---- ESTADOS DEL COMPONENTE ----

  // Controla si estamos en modo edición o visualización
  const [isEditing, setIsEditing] = useState(false);

  // Estados para los campos editables (copias locales de las props)
  // Se mantienen separados de las props para permitir edición sin afectar
  // el estado padre hasta que el usuario confirme los cambios
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description);
  const [editUrl, setEditUrl] = useState(url);

  // Estado para mostrar feedback visual cuando se copia al portapapeles
  const [copied, setCopied] = useState(false);

  // Formato seleccionado para el texto de salida (WhatsApp por defecto)
  const [format, setFormat] = useState<FormatType>('whatsapp');

  /**
   * Effect para sincronizar el estado local cuando las props cambian.
   *
   * Esto es necesario porque cuando el usuario extrae una nueva URL,
   * las props se actualizan pero el estado local mantendría los valores
   * antiguos sin este effect.
   *
   * Dependencias: [title, description, url] - Se ejecuta cuando cualquiera cambia
   */
  useEffect(() => {
    setEditTitle(title);
    setEditDescription(description);
    setEditUrl(url);
  }, [title, description, url]);

  /**
   * Formatea el título según la plataforma seleccionada.
   *
   * @param text - Texto a formatear (título)
   * @param fmt - Formato de salida ('whatsapp' o 'telegram')
   * @returns Texto con el formato de negrita correspondiente
   *
   * Ejemplos:
   * - formatTitle("Hola", "whatsapp") → "*Hola*"
   * - formatTitle("Hola", "telegram") → "**Hola**"
   */
  const formatTitle = (text: string, fmt: FormatType) => {
    return fmt === 'whatsapp' ? `*${text}*` : `**${text}**`;
  };

  /**
   * Texto formateado listo para compartir.
   *
   * Estructura del texto:
   * 1. Título en negrita (formato según plataforma)
   * 2. Línea en blanco
   * 3. Descripción
   * 4. Línea en blanco
   * 5. URL
   *
   * Este formato es óptimo para WhatsApp y Telegram porque:
   * - El título destaca visualmente con negrita
   * - Las líneas en blanco mejoran la legibilidad
   * - La URL al final permite que se genere preview automático
   */
  const formattedText = `${formatTitle(editTitle, format)}\n\n${editDescription}\n\n${editUrl}`;

  /**
   * Handler para copiar el texto formateado al portapapeles.
   *
   * Usa la API moderna navigator.clipboard que:
   * - Funciona en HTTPS y localhost
   * - Es asíncrona (devuelve Promise)
   * - Requiere permiso del usuario en algunos navegadores
   *
   * Muestra feedback visual cambiando el botón a "¡Copiado!" durante 2 segundos.
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      // Restaurar el estado después de 2 segundos
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback si la API de clipboard falla (ej: navegador antiguo, sin HTTPS)
      alert('Error al copiar al portapapeles');
    }
  };

  /**
   * Handler para guardar los cambios de edición.
   *
   * 1. Llama al callback onEdit con los nuevos valores
   * 2. Sale del modo edición
   *
   * El componente padre (page.tsx) es responsable de actualizar su estado
   * con los nuevos valores recibidos en onEdit.
   */
  const handleSaveEdit = () => {
    onEdit({
      title: editTitle,
      description: editDescription,
      url: editUrl,
    });
    setIsEditing(false);
  };

  /**
   * Handler para cancelar la edición.
   *
   * 1. Restaura los valores locales a las props originales
   * 2. Sale del modo edición
   *
   * Esto descarta cualquier cambio que el usuario haya hecho en el formulario.
   */
  const handleCancelEdit = () => {
    setEditTitle(title);
    setEditDescription(description);
    setEditUrl(url);
    setIsEditing(false);
  };

  // ---- RENDERIZADO DEL COMPONENTE ----
  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
      {/* ---- SECCIÓN DE IMAGEN ---- */}
      {/* Solo se muestra si hay una imagen disponible */}
      {image && (
        <div className="relative aspect-video bg-gray-100">
          {/* Imagen destacada con aspect ratio 16:9 */}
          <img
            src={image}
            alt={editTitle}
            className="w-full h-full object-cover"
            // Si la imagen falla al cargar, la ocultamos en lugar de mostrar icono roto
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {/* Botón para abrir la imagen en nueva pestaña (útil para guardarla) */}
          <a
            href={image}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded hover:bg-black/90 transition-colors"
          >
            Abrir imagen
          </a>
        </div>
      )}

      {/* ---- SECCIÓN DE CONTENIDO ---- */}
      <div className="p-4 space-y-3">
        {/* Renderizado condicional: modo edición vs modo visualización */}
        {isEditing ? (
          /* ---- MODO EDICIÓN ---- */
          <div className="space-y-3">
            {/* Campo de edición: Título */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Campo de edición: Descripción (textarea para texto largo) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Campo de edición: URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL
              </label>
              <input
                type="url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Botones de acción: Guardar y Cancelar */}
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Guardar
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          /* ---- MODO VISUALIZACIÓN ---- */
          <>
            {/* Título y autor */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 line-clamp-2">
                {editTitle}
              </h2>
              {/* El autor solo se muestra si existe */}
              {author && (
                <p className="text-sm text-gray-500 mt-1">por {author}</p>
              )}
            </div>

            {/* Descripción con límite de 3 líneas */}
            <p className="text-gray-600 text-sm line-clamp-3">{editDescription}</p>

            {/* URL clickeable que abre en nueva pestaña */}
            <a
              href={editUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 text-sm truncate hover:underline"
            >
              {editUrl}
            </a>

            {/* ---- SECCIÓN DE FORMATO Y PREVIEW ---- */}
            <div className="pt-2 border-t border-gray-100">
              {/* Selector de formato: WhatsApp o Telegram */}
              <div className="flex items-center gap-4 mb-2">
                <span className="text-xs text-gray-400">Formato:</span>

                {/* Radio button: WhatsApp */}
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="whatsapp"
                    checked={format === 'whatsapp'}
                    onChange={() => setFormat('whatsapp')}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">WhatsApp</span>
                </label>

                {/* Radio button: Telegram */}
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="telegram"
                    checked={format === 'telegram'}
                    onChange={() => setFormat('telegram')}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Telegram</span>
                </label>
              </div>

              {/* Preview del texto formateado */}
              <p className="text-xs text-gray-400 mb-2">Texto de salida:</p>
              <pre className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 whitespace-pre-wrap font-mono">
                {formattedText}
              </pre>
            </div>

            {/* ---- BOTÓN DE COPIAR ---- */}
            <div className="pt-2">
              <button
                onClick={handleCopy}
                className={`w-full py-2 px-4 rounded-lg transition-colors font-medium ${
                  copied
                    ? 'bg-green-600 text-white'  // Estado: copiado exitosamente
                    : 'bg-gray-900 text-white hover:bg-gray-800'  // Estado: normal
                }`}
              >
                {copied ? '¡Copiado!' : 'Copiar Texto'}
              </button>
            </div>

            {/* Botón para entrar en modo edición */}
            <button
              onClick={() => setIsEditing(true)}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
            >
              Editar detalles
            </button>
          </>
        )}
      </div>
    </div>
  );
}
