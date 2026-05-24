/**
 * Extracts the 11-character YouTube video ID from a URL.
 */
export const extractYoutubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

/**
 * Returns a high-res thumbnail URL for a given YouTube ID.
 */
export const getYoutubeThumbnail = (id) => {
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
};
