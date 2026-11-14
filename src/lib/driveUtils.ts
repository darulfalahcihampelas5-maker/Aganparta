export const getDriveImageUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  const cleanUrl = url.trim();

  // If already base64 or blob or local asset, return directly
  if (cleanUrl.startsWith("data:") || cleanUrl.startsWith("blob:") || cleanUrl.startsWith("/")) {
    return cleanUrl;
  }

  // Regex patterns to match Google Drive File ID (25+ alphanumeric chars with - and _)
  // Supports:
  // - drive.google.com/file/d/{id}/view...
  // - drive.google.com/open?id={id}
  // - drive.google.com/uc?id={id}
  // - docs.google.com/file/d/{id}/
  // - lh3.googleusercontent.com/d/{id}
  const matchD = cleanUrl.match(/\/(?:file\/)?d\/([-\w]{25,})/i);
  const matchQuery = cleanUrl.match(/[?&]id=([-\w]{25,})/i);
  const matchLh3 = cleanUrl.match(/lh3\.googleusercontent\.com\/d\/([-\w]{25,})/i);

  const fileId = matchD ? matchD[1] : (matchQuery ? matchQuery[1] : (matchLh3 ? matchLh3[1] : ""));

  if (fileId) {
    // Official Google CDN URL for direct public image embedding
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  // If user pasted raw file ID directly (e.g. 1P395tuZymxs3qero4XduMpHy7g2GJrdR)
  if (/^[a-zA-Z0-9_-]{25,45}$/.test(cleanUrl)) {
    return `https://lh3.googleusercontent.com/d/${cleanUrl}`;
  }

  return cleanUrl;
};

// Fallback secondary URL in case primary CDN has a temporary block
export const getDriveImageFallbackUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  const cleanUrl = url.trim();
  const match = cleanUrl.match(/(?:\/d\/|id=|lh3\.googleusercontent\.com\/d\/)([-\w]{25,})/i);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
  }
  return cleanUrl;
};

// Helper for embedding Google Drive PDF preview in iframe
export const getDrivePdfEmbedUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  const cleanUrl = url.trim();
  const matchD = cleanUrl.match(/\/(?:file\/)?d\/([-\w]{25,})/i);
  const matchQuery = cleanUrl.match(/[?&]id=([-\w]{25,})/i);
  const fileId = matchD ? matchD[1] : (matchQuery ? matchQuery[1] : "");
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return cleanUrl;
};

// Extract 11-char YouTube Video ID
export const getYouTubeVideoId = (url: string | null | undefined): string => {
  if (!url) return "";
  const clean = url.trim();
  const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
  return match && match[1] ? match[1] : "";
};

// Check if a URL points to YouTube
export const isYouTubeUrl = (url: string | null | undefined): boolean => {
  return Boolean(getYouTubeVideoId(url));
};

// Get YouTube thumbnail URL for preview cards
export const getYouTubeThumbnailUrl = (url: string | null | undefined): string => {
  const id = getYouTubeVideoId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
};

// Convert standard YouTube URLs into embeddable iframe players (iOS playsinline supported)
export const getYouTubeEmbedUrl = (url: string | null | undefined, autoplay = false): string => {
  if (!url) return "";
  const clean = url.trim();
  const id = getYouTubeVideoId(clean);
  if (id) {
    return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1${autoplay ? "&autoplay=1" : ""}`;
  }
  return clean;
};

// Ensure external URLs have explicit https:// scheme for safe direct opening on iOS & Android
export const getExternalOpenUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  const clean = url.trim();
  if (!clean) return "";
  if (
    /^https?:\/\//i.test(clean) ||
    clean.startsWith("data:") ||
    clean.startsWith("blob:") ||
    clean.startsWith("/")
  ) {
    return clean;
  }
  return `https://${clean}`;
};

// Direct download URL helper (especially helpful on iOS Safari when inline embed is restricted)
export const getDirectDownloadUrl = (url: string | null | undefined): string => {
  const clean = getExternalOpenUrl(url);
  if (!clean) return "";
  const matchD = clean.match(/\/(?:file\/)?d\/([-\w]{25,})/i);
  const matchQuery = clean.match(/[?&]id=([-\w]{25,})/i);
  const driveFileId = matchD ? matchD[1] : (matchQuery ? matchQuery[1] : "");
  if (driveFileId) {
    return `https://drive.google.com/uc?export=download&id=${driveFileId}`;
  }
  return clean;
};

// Alternative Google Docs / Drive viewer URL for iOS WebKit & Android cross-browser compatibility
export const getAlternativePdfEmbedUrl = (url: string | null | undefined): string => {
  const clean = getExternalOpenUrl(url);
  if (!clean) return "";
  const matchD = clean.match(/\/(?:file\/)?d\/([-\w]{25,})/i);
  const matchQuery = clean.match(/[?&]id=([-\w]{25,})/i);
  const driveFileId = matchD ? matchD[1] : (matchQuery ? matchQuery[1] : "");
  if (driveFileId) {
    return `https://docs.google.com/viewer?srcid=${driveFileId}&pid=explorer&efh=false&a=v&chrome=false&embedded=true`;
  }
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(clean)}`;
};

// Detect media type and return optimal in-app embed URL
export const getMediaEmbedUrl = (url: string | null | undefined, autoplay = false): { type: "youtube" | "pdf" | "docs" | "general", embedUrl: string } => {
  if (!url) return { type: "general", embedUrl: "" };
  const clean = getExternalOpenUrl(url);

  // 1. YouTube Video
  if (isYouTubeUrl(clean)) {
    return {
      type: "youtube",
      embedUrl: getYouTubeEmbedUrl(clean, autoplay)
    };
  }

  // 2. Google Drive preview (PDF, docs, slides, videos stored on Drive)
  const matchD = clean.match(/\/(?:file\/)?d\/([-\w]{25,})/i);
  const matchQuery = clean.match(/[?&]id=([-\w]{25,})/i);
  const driveFileId = matchD ? matchD[1] : (matchQuery ? matchQuery[1] : "");
  if (driveFileId) {
    return {
      type: "pdf",
      embedUrl: `https://drive.google.com/file/d/${driveFileId}/preview`
    };
  }

  // 3. Google Docs / Sheets / Slides
  if (clean.includes("docs.google.com/presentation")) {
    const presMatch = clean.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (presMatch && presMatch[1]) {
      return {
        type: "docs",
        embedUrl: `https://docs.google.com/presentation/d/${presMatch[1]}/embed?start=false&loop=false`
      };
    }
  }
  if (clean.includes("docs.google.com/document")) {
    const docMatch = clean.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (docMatch && docMatch[1]) {
      return {
        type: "docs",
        embedUrl: `https://docs.google.com/document/d/${docMatch[1]}/preview`
      };
    }
  }
  if (clean.includes("docs.google.com/spreadsheets")) {
    const sheetMatch = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (sheetMatch && sheetMatch[1]) {
      return {
        type: "docs",
        embedUrl: `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/preview`
      };
    }
  }

  // 4. Direct PDF links -> route through Google Docs Viewer so iOS Safari/Chrome & Android scroll all pages cleanly
  if (/\.pdf(\?.*)?$/i.test(clean) && !clean.startsWith("data:") && !clean.startsWith("blob:")) {
    return {
      type: "pdf",
      embedUrl: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(clean)}`
    };
  }

  if (/\.pdf(\?.*)?$/i.test(clean)) {
    return {
      type: "pdf",
      embedUrl: clean
    };
  }

  return {
    type: "general",
    embedUrl: clean
  };
};

