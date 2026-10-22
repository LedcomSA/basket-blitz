/**
 * PlayButton — fires 'game:play' when clicked.
 * Attach to an entity with button + element(image) components.
 */
var PlayButton = pc.createScript('playButton');

PlayButton.prototype.initialize = function () {
    var self = this;
    this.entity.button.on('click', function () {
        self.app.fire('game:play');
    });
};
