const ICONS = {
  story:'<path d="M7 4h3l2 5-2 2c1.2 2.3 2.7 3.8 5 5l2-2 5 2v3c0 1.1-.9 2-2 2C11.2 21 3 12.8 3 4c0-1.1.9-2 2-2h2Z"/>',
  leisure:'<path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"/><path d="M16 10h2a3 3 0 0 1 0 6h-2M7 3v2m4-2v2"/>',
  training:'<path d="M3 9v6m4-8v10m10-10v10m4-8v6M7 12h10M1 11v2m22-2v2"/>',
  social:'<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c.5-4 2.3-6 5.5-6s5 2 5.5 6M14 15c3.7-.7 6.2 1 7 4"/>',
  purchase:'<path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
  work:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/>',
  sidequest:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15m6-12v15"/><circle cx="15" cy="10" r="1.5"/>',
  factions:'<path d="M5 22V3m0 2h12l-2 4 2 4H5"/>',
  recovery:'<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/>',
  entertainment:'<path d="M9 18V5l11-2v13M9 8l11-2"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  risk:'<path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5m0 3h.01"/>',
  industry:'<path d="M3 21V9l6 4V9l6 4V5h6v16H3Z"/><path d="M6 17h2m3 0h2m4 0h2"/>',
  combat:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',
  health:'<path d="M20.8 5.8a5.4 5.4 0 0 0-7.6 0L12 7l-1.2-1.2a5.4 5.4 0 1 0-7.6 7.6L12 22l8.8-8.6a5.4 5.4 0 0 0 0-7.6Z"/>',
  fatigue:'<rect x="3" y="6" width="17" height="12" rx="2"/><path d="M20 10h2v4h-2M6 9h5v6H6"/>',
  stress:'<path d="M9 4a4 4 0 0 0-4 4v1a4 4 0 0 0 0 7v1a4 4 0 0 0 7 2 4 4 0 0 0 7-2v-1a4 4 0 0 0 0-7V8a4 4 0 0 0-7-2 4 4 0 0 0-3-2Z"/><path d="M12 6v13M7 9h2m6 2h2m-9 5h2"/>',
  cash:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',
  relation:'<circle cx="9" cy="8" r="3"/><path d="M3 20c.5-4 2.5-6 6-6 2 0 3.6.7 4.6 2"/><path d="M18 12c2.7-2.8 6.5 1.5 0 6-6.5-4.5-2.7-8.8 0-6Z"/>',
  people:'<path d="M4 21V8h6v13m4 0V3h6v18M2 21h20"/><path d="M6 11h2m-2 4h2m8-8h2m-2 4h2m-2 4h2"/>',
  morning:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M4.9 4.9 7 7m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17m10-10 2.1-2.1"/>',
  afternoon:'<path d="M3 18h18M5 18a7 7 0 0 1 14 0"/><path d="M12 4v3M4.9 9.9 7 12m10 0 2.1-2.1"/>',
  night:'<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/><path d="m17 4 .5 1.2L19 6l-1.5.8L17 8l-.5-1.2L15 6l1.5-.8L17 4Z"/>',
  success:'<circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16.5 9"/>',
  failure:'<path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5m0 3h.01"/>',
  attack:'<path d="M4 20 20 4M14 4h6v6"/><path d="m5 14 5 5-2 2-5-5 2-2Z"/>',
  brawl:'<path d="M5 13V8a2 2 0 0 1 4 0v3-5a2 2 0 0 1 4 0v5-4a2 2 0 0 1 4 0v5-2a2 2 0 0 1 4 0v5c0 4-3 7-7 7h-2c-3 0-5-1-7-4l-2-3a2 2 0 0 1 2-2Z"/>',
  hack:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 9h6v6H9V9Zm3-7v4m0 12v4M2 12h4m12 0h4M5 5l2 2m10 10 2 2m0-14-2 2M7 17l-2 2"/>',
  guard:'<path d="M12 3 4 6v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-3Z"/><path d="m8.5 12 2.3 2.3 4.7-5"/>',
  flee:'<path d="M5 17h14l-1-6-2-3H8l-2 3-1 6Z"/><path d="M3 14h2m14 0h2M8 17v2m8-2v2M8 12h8"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/>',
  default:'<path d="m12 3 8 9-8 9-8-9 8-9Z"/><circle cx="12" cy="12" r="2"/>'
};

export function uiIcon(name,className=""){
  const body=ICONS[name]||ICONS.default;
  return `<svg class="ui-icon ${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

const LIFE_ICONS={life_leisure:"leisure",life_training:"training",life_social:"social",life_purchase:"purchase",life_work:"work",life_sidequest:"sidequest",life_conflict:"factions"};
const NIGHT_ICONS={recovery:"recovery",entertainment:"entertainment",social:"social",risk:"risk",industry:"industry",combat:"combat"};

export function cardIconName(card){
  if(card.main)return "story";
  return LIFE_ICONS[card.id]||NIGHT_ICONS[card.kind]||"default";
}

export const questIconName=type=>({"人物":"social","犯罪":"risk","城市":"people"}[type]||"sidequest");
