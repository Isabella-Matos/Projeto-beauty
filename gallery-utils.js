// Normaliza somente caminhos seguros para arquivos locais diretamente em imagens/.
export function getLocalGalleryPath(value) {
  if (typeof value !== "string") {
    return null;
  }

  let normalizedPath = value.trim();

  if (normalizedPath.startsWith("./")) {
    normalizedPath = normalizedPath.slice(2);
  }

  if (!normalizedPath.startsWith("imagens/")) {
    return null;
  }

  let fileName;

  try {
    fileName = decodeURIComponent(normalizedPath.slice("imagens/".length));
  } catch (error) {
    return null;
  }

  if (
    !fileName ||
    fileName.includes("/") ||
    fileName.includes("\\") ||
    fileName.includes("..") ||
    /[%?#:\u0000-\u001f]/.test(fileName) ||
    !/^[\p{L}\p{N} ._()-]+\.(?:png|jpe?g|webp|gif)$/iu.test(fileName)
  ) {
    return null;
  }

  return `imagens/${encodeURIComponent(fileName)}`;
}
