(function (frp, _, React, KefirConnect) {
    'use strict';
    var h = React.createElement;

    var ARROW_UP = 38;
    var ARROW_DOWN = 40;

    function keyProperty(keyCode) {
        var keydown = frp.fromEvent(document.body, 'keydown')
            .map(_.prop('which'));

        var start = keydown
            .filter(_.eq(keyCode))
            .map(_.always(true));

        var keyup = frp
            .fromEvent(document.body, 'keyup')
            .map(_.prop('which'));

        var end = keyup
            .filter(_.eq(keyCode))
            .map(_.always(false));

        var key = frp
            .merge([start, end])
            .toProperty();

        return key;
    }

    var up = keyProperty(ARROW_UP);
    var down = keyProperty(ARROW_DOWN);

    var xDelta = frp
        .merge([
            up.map(_.multiply(1)),
            down.map(_.multiply(-1))
        ])
        .sampledBy(frp.interval(10, 0))
        .filter();

    var possibleNewPlace = xDelta
        .flatMap(function (delta) {
            return x
                .take(1)
                .map(_.add(delta));
        });

    var outOfLeftBoundFilter = possibleNewPlace
        .map(_.lte(0))
        .combine(xDelta.map(_.lte(0)), _.or);

    var outOfRightBoundFilter = possibleNewPlace
        .map(_.gte(1000))
        .combine(xDelta.map(_.gte(0)), _.or);

    var outOfBoundFilter = frp
        .combine([
            outOfLeftBoundFilter,
            outOfRightBoundFilter
        ], _.and);

    var x = xDelta
        .filterBy(outOfBoundFilter)
        .scan(_.add)
        .toProperty(0);

    var position = frp
        .combine([x], function (x) {
            return {
                x: x
            };
        })
        .toProperty();

    var GameView = React.createClass({
        mixins: [KefirConnect(position, 'position')],
        render: function () {
            return h('div', null, this.state.position.x);
        }
    });

    React.render(
        h(GameView),
        document.getElementById('game')
    );
}(Kefir, R, React, KefirConnect));
