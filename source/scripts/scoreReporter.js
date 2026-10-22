/**
 * ScoreReporter — posts the game result to a REST endpoint as JSON.
 *
 * A game is `shotsPerGame` resolved shots (a shot resolves on 'ball:reset'
 * after a launch). When the game ends it POSTs
 * { game, score, result, shots } to `endpoint` — result is 'win' when
 * score >= winScore, else 'lose'. Counters then reset for a new game.
 *
 * Listens: game:play, ball:launch, ball:score, ball:reset
 */
var ScoreReporter = pc.createScript('scoreReporter');

ScoreReporter.attributes.add('endpoint', {
    type: 'string',
    default: 'https://api.wingame.ledpilot.eu/basket/result',
    title: 'Result endpoint'
});
ScoreReporter.attributes.add('game', { type: 'string', default: 'basket', title: 'Game id' });
ScoreReporter.attributes.add('shotsPerGame', { type: 'number', default: 10, min: 1, title: 'Shots per game' });
ScoreReporter.attributes.add('winScore', { type: 'number', default: 5, min: 0, title: 'Score to win' });
ScoreReporter.attributes.add('enabled', { type: 'boolean', default: true, title: 'Send results' });

ScoreReporter.prototype.initialize = function () {
    this._score = 0;
    this._resolved = 0;
    this._inFlight = false;

    var self = this;
    this.app.on('game:play', function () {
        self._score = 0;
        self._resolved = 0;
        self._inFlight = false;
    });
    this.app.on('ball:launch', function () { self._inFlight = true; });
    this.app.on('ball:score', function (points) { self._score += points; });
    this.app.on('ball:reset', function () {
        if (!self._inFlight) return;
        self._inFlight = false;
        self._resolved++;
        if (self._resolved >= self.shotsPerGame) self._send();
    });
};

ScoreReporter.prototype._send = function () {
    var payload = {
        game: this.game,
        score: this._score,
        result: this._score >= this.winScore ? 'win' : 'lose',
        shots: this._resolved
    };
    this._score = 0;
    this._resolved = 0;

    if (!this.enabled || !this.endpoint) return;

    fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(function (res) {
        console.warn('[API] result sent', res.status, payload);
    }).catch(function (err) {
        console.warn('[API] send failed:', err, payload);
    });
};
