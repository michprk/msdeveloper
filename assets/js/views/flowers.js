// Petites pervenches bleues, les mêmes que sur le site M&S Design (rendu 3D, fond transparent).
export const flower = (n = 1, cls = '') => `<img class="fl ${cls}" src="assets/img/fleur-${((n - 1) % 4) + 1}.webp" width="180" height="180" alt="" aria-hidden="true" decoding="async" draggable="false">`;
// Un petit bouquet de trois fleurs, qui tournent toutes dans le même sens.
export const cluster = (cls = '') => `<span class="fl-cluster ${cls}" aria-hidden="true">${flower(1, 'f-a')}${flower(3, 'f-b')}${flower(2, 'f-c')}</span>`;
