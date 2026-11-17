const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

export const mediaUrl = (fileUrl) => {
  if (!fileUrl) return "";
  return new URL(fileUrl, backendUrl).toString();
};
