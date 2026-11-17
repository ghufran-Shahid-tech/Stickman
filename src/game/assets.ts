export const GAME_ASSETS = {
  player: '/assets/aistudio/1794839940195_2d1de1a1.png',
  playerShot: '/assets/aistudio/file_00000000b6608211b46651e9b1d07389_04d5798d.png',
  enemies: [
    '/assets/aistudio/enemy1_7461ddd5.png',
    '/assets/aistudio/enemy2_194649f1.png',
    '/assets/aistudio/enemy3_417b1739.png',
    '/assets/aistudio/file_00000000ccf082089de86bf48d04a107_3bf0a5c1.png',
    '/assets/aistudio/Picsart_26-11-16_19-17-16-703_eedf2016.png',
    '/assets/aistudio/file_00000000a090821188d76afdc2515674_74480ea5.png',
    '/assets/aistudio/Picsart_26-11-17_17-15-37-284_a829c608.png',
  ] as const,
  enemyAudio: [
    '/assets/aistudio/Enemy_one_d25a6cc6.mp3',
    '/assets/aistudio/Enemy_two_a1a149ed.mp3',
    '/assets/aistudio/Enemy_three_95f46836.mp3',
    '/assets/aistudio/cid-le-mdc_96da965d.mp3',
    '/assets/aistudio/lv_0_20261116193411_39098c4e.mp3',
    '/assets/aistudio/lv_0_20261117170539_261a41e5.mp3',
    '/assets/aistudio/suuuuuuuuuuuuu_14154ea1.mp3',
  ] as const,
  fireAudio: '/assets/aistudio/gun-shoot-ans-reload_7403fed2.mp3',
  hitAudio: '/assets/aistudio/lv_0_20261117164428_c7b718ac.mp3',
  missAudio: '/assets/aistudio/are-baap-re-yaad-aya_c69626c2.mp3',
} as const;

export const STORAGE_KEYS = {
  bestScore: 'stickmanLauncherBest',
  muted: 'stickmanLauncherMuted',
} as const;
