/**
 * GameManager — menu → gameplay state machine + score display.
 *
 * Events:
 *   fires  'game:menu'  when returning to the menu
 *   fires  'ball:launch'
 *   listens 'game:play'  (from the PLAY button)
 *   listens 'ball:score' (points awarded by ballThrower)
 */
var GameManager = pc.createScript('gameManager');

GameManager.attributes.add('menu', { type: 'entity', title: 'Menu root' });
GameManager.attributes.add('hud', { type: 'entity', title: 'HUD root' });
GameManager.attributes.add('scoreText', { type: 'entity', title: 'Score text element' });
GameManager.attributes.add('shotsText', { type: 'entity', title: 'Shots text element' });

GameManager.prototype.initialize = function () {
    this.score = 0;
    this.shots = 0;

    var self = this;
    this.app.on('game:play', this.onPlay, this);
    this.app.on('ball:score', this.onScore, this);
    this.app.on('ball:launch', function () { self.shots++; self._updateHud(); });

    this.showMenu();
};

GameManager.prototype.showMenu = function () {
    if (this.menu) this.menu.enabled = true;
    if (this.hud) this.hud.enabled = false;
    this.app.fire('game:menu');
};

GameManager.prototype.onPlay = function () {
    this.score = 0;
    this.shots = 0;
    if (this.menu) this.menu.enabled = false;
    if (this.hud) this.hud.enabled = true;
    this._updateHud();
};

GameManager.prototype.onScore = function (points) {
    this.score += points;
    this._updateHud();
};

GameManager.prototype._updateHud = function () {
    if (this.scoreText && this.scoreText.element) {
        this.scoreText.element.text = 'SCORE: ' + this.score;
    }
    if (this.shotsText && this.shotsText.element) {
        this.shotsText.element.text = 'SHOTS: ' + this.shots;
    }
};
