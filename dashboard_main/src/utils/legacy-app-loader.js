const isAbsoluteUrl = (value) => /^(https?:)?\/\//i.test(value);

const resolveAssetUrl = (basePath, assetPath) => {
  if (!assetPath) return "";
  if (isAbsoluteUrl(assetPath) || assetPath.startsWith("/")) return assetPath;
  if (assetPath.startsWith("./")) return `${basePath}/${assetPath.slice(2)}`;
  return `${basePath}/${assetPath}`;
};

const loadScript = (script) =>
  new Promise((resolve, reject) => {
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${script.src || "inline script"}`)), {
      once: true,
    });
  });

export const mountLegacyApp = async ({ appBasePath, mountNode }) => {
  const response = await fetch(`${appBasePath}/index.html`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${appBasePath}/index.html`);
  }

  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  mountNode.innerHTML = doc.body.innerHTML;

  const injectedNodes = [];

  const styles = [...doc.head.querySelectorAll("link[rel='stylesheet'], style")];
  for (const styleNode of styles) {
    if (styleNode.tagName.toLowerCase() === "link") {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = resolveAssetUrl(appBasePath, styleNode.getAttribute("href"));
      link.dataset.legacyApp = appBasePath;
      document.head.appendChild(link);
      injectedNodes.push(link);
      continue;
    }

    const style = document.createElement("style");
    style.textContent = styleNode.textContent;
    style.dataset.legacyApp = appBasePath;
    document.head.appendChild(style);
    injectedNodes.push(style);
  }

  const scripts = [...doc.head.querySelectorAll("script"), ...doc.body.querySelectorAll("script")];

  for (const scriptNode of scripts) {
    const script = document.createElement("script");
    script.dataset.legacyApp = appBasePath;

    const src = scriptNode.getAttribute("src");
    if (src) {
      script.src = resolveAssetUrl(appBasePath, src);
      if (scriptNode.getAttribute("crossorigin")) {
        script.crossOrigin = scriptNode.getAttribute("crossorigin");
      }
      if (scriptNode.getAttribute("referrerpolicy")) {
        script.referrerPolicy = scriptNode.getAttribute("referrerpolicy");
      }
      const loadPromise = loadScript(script);
      document.body.appendChild(script);
      injectedNodes.push(script);
      await loadPromise;
      continue;
    }

    script.textContent = scriptNode.textContent;
    document.body.appendChild(script);
    injectedNodes.push(script);
  }

  return () => {
    mountNode.innerHTML = "";
    for (const node of injectedNodes) {
      node.remove();
    }
  };
};
