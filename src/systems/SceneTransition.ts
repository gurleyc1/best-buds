export class SceneTransition {
  static fadeOut(scene: Phaser.Scene, duration = 300): Promise<void> {
    return new Promise((resolve) => {
      scene.cameras.main.fadeOut(duration, 0, 0, 0);
      scene.cameras.main.once('camerafadeoutcomplete', resolve);
    });
  }

  static fadeIn(scene: Phaser.Scene, duration = 300): void {
    scene.cameras.main.fadeIn(duration, 0, 0, 0);
  }

  static async switchScene(scene: Phaser.Scene, targetKey: string, data?: object): Promise<void> {
    await this.fadeOut(scene, 300);
    scene.scene.start(targetKey, data);
  }
}
