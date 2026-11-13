const API_ORIGIN = "http://127.0.0.1:8000";

export const mediaUrl = (fileUrl) => {
  if (!fileUrl) return "";
  return new URL(fileUrl, API_ORIGIN).toString();
};
