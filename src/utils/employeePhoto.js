export function imageFileToDataUrl(file) {
  if (!file?.type?.startsWith("image/")) return Promise.reject(new Error("សូមជ្រើសរើសឯកសារ JPG ឬ PNG"));
  if (file.size > 2 * 1024 * 1024) return Promise.reject(new Error("រូបភាពត្រូវមានទំហំមិនលើសពី 2MB"));
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 512 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
      if (dataUrl.length > 350_000) reject(new Error("រូបភាពធំពេក សូមជ្រើសរើសរូបតូចជាងនេះ"));
      else resolve(dataUrl);
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("មិនអាចអានរូបភាពនេះបានទេ")); };
    image.src = url;
  });
}
