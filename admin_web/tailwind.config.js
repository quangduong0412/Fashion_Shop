export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class", 
  theme: { 
    extend: { 
      "colors": { 
        "outline-variant": "#e3bebc", "surface-container-high": "#e6e6ff", "on-secondary-fixed-variant": "#2d486d", 
        "on-tertiary-fixed": "#241a00", "on-secondary-container": "#3e5980", "on-error": "#ffffff", "on-primary-fixed": "#410007", 
        "secondary-fixed": "#d5e3ff", "on-secondary-fixed": "#001c3b", "primary-fixed": "#ffdad8", "tertiary-fixed": "#ffe088", 
        "on-background": "#181a2e", "on-surface-variant": "#5b403f", "surface-variant": "#e0e0fc", "secondary": "#455f87", 
        "inverse-on-surface": "#f1efff", "tertiary-container": "#cca830", "on-tertiary-container": "#4f3e00", 
        "inverse-surface": "#2d2f44", "on-primary-container": "#fffbff", "on-primary": "#ffffff", "surface-tint": "#ba192d", 
        "primary": "#b6152b", "error": "#ba1a1a", "on-secondary": "#ffffff", "inverse-primary": "#ffb3b1", "surface-dim": "#d7d8f4", 
        "surface-container-low": "#f4f2ff", "on-primary-fixed-variant": "#92001c", "tertiary": "#735c00", "on-tertiary": "#ffffff", 
        "on-surface": "#181a2e", "tertiary-fixed-dim": "#e9c349", "primary-container": "#d93340", "surface-container": "#edecff", 
        "on-error-container": "#93000a", "secondary-container": "#b5d0fd", "surface-container-lowest": "#ffffff", 
        "primary-fixed-dim": "#ffb3b1", "error-container": "#ffdad6", "outline": "#8f6f6e", "on-tertiary-fixed-variant": "#574500", 
        "background": "#fbf8ff", "secondary-fixed-dim": "#adc8f5", "surface": "#fbf8ff", "surface-container-highest": "#e0e0fc", 
        "surface-bright": "#fbf8ff" 
      }, 
      "borderRadius": { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" }, 
      "spacing": { "margin-mobile": "1rem", "space-lg": "1.5rem", "space-sm": "0.5rem", "gutter-mobile": "0.75rem", "gutter": "1.5rem", "margin": "2rem", "space-md": "1rem", "space-xl": "2.5rem", "space-xs": "0.25rem" }, 
      "fontFamily": { 
        "headline-lg-mobile": [ "Playfair Display" ], "body-md": [ "Inter" ], "body-sm": [ "Inter" ], "label-lg": [ "Inter" ], 
        "headline-md": [ "Inter" ], "label-md": [ "Inter" ], "display-md-mobile": [ "Playfair Display" ], "headline-sm": [ "Inter" ], 
        "body-lg": [ "Inter" ], "display-lg": [ "Playfair Display" ], "display-md": [ "Playfair Display" ], "headline-lg": [ "Playfair Display" ], "label-sm": [ "Inter" ] 
      }, 
      "fontSize": { 
        "headline-lg-mobile": [ "22px", { "lineHeight": "28px", "fontWeight": "600" } ], 
        "body-md": [ "14px", { "lineHeight": "20px", "fontWeight": "400" } ], 
        "body-sm": [ "12px", { "lineHeight": "16px", "fontWeight": "400" } ], 
        "label-lg": [ "14px", { "lineHeight": "20px", "letterSpacing": "0.01em", "fontWeight": "500" } ], 
        "headline-md": [ "20px", { "lineHeight": "28px", "fontWeight": "600" } ], 
        "label-md": [ "12px", { "lineHeight": "16px", "letterSpacing": "0.04em", "fontWeight": "600" } ], 
        "display-md-mobile": [ "28px", { "lineHeight": "34px", "letterSpacing": "-0.01em", "fontWeight": "600" } ], 
        "headline-sm": [ "16px", { "lineHeight": "24px", "fontWeight": "600" } ], 
        "body-lg": [ "16px", { "lineHeight": "24px", "fontWeight": "400" } ], 
        "display-lg": [ "48px", { "lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700" } ], 
        "display-md": [ "36px", { "lineHeight": "44px", "letterSpacing": "-0.015em", "fontWeight": "600" } ], 
        "headline-lg": [ "28px", { "lineHeight": "36px", "fontWeight": "600" } ], 
        "label-sm": [ "11px", { "lineHeight": "14px", "letterSpacing": "0.05em", "fontWeight": "600" } ] 
      } 
    } 
  } 
};
