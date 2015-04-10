(function (frp, _, React, KefirConnect) {
    'use strict';
    var h = React.createElement;

    function keyProperty(keyCode) {
        return function (keydown, keyup) {
            var start = keydown
                .filter(_.eq(keyCode))
                .map(_.always(true));

            var end = keyup
                .filter(_.eq(keyCode))
                .map(_.always(false));

            var key = frp
                .merge([start, end])
                .toProperty();

            return key;
        };
    }

    function intervalChange(step, interval) {
        return function (up, down) {
            return frp
                .merge([
                    up.map(_.multiply(step)),
                    down.map(_.multiply(-step))
                ])
                .sampledBy(frp.interval(interval, 0))
                .filter();
        };
    }

    function boundsFilter(bottomBound, topBound) {
        return function (value, direction) {
            var isInBottomBound = frp
                .combine([
                        value.map(_.lte(bottomBound))
                    ], [
                        direction.map(_.lte(0))
                    ],
                    _.or
                );

            var isInTopBound = frp
                .combine([
                        value.map(_.gte(topBound))
                    ], [
                        direction.map(_.gte(0))
                    ],
                    _.or
                );

            return frp
                .zip([
                    isInBottomBound,
                    isInTopBound
                ], _.and);
        };
    }

    function boundedValue(bottomBound, topBound, initialValue) {
        return function (valueChangeStream) {
            var possibleNewValue = valueChangeStream
                .flatMapConcat(function (delta) {
                    return value
                        .take(1)
                        .map(_.add(delta));
                });

            var isInBounds = boundsFilter(bottomBound, topBound)(
                possibleNewValue,
                valueChangeStream
            );
            
            // value should be `.combine([isInBounds], [possibleNewValue], ...)`
            // or `.sampledBy(isInBounds)`
            // because value can be updated before `isInBounds`
            var value = possibleNewValue
                .filterBy(isInBounds)
                .toProperty(initialValue);

            return value;
        };
    }

    function coord(x, y) {
        return frp
            .combine([x, y], function (x, y) {
                return {
                    x: x,
                    y: y
                };
            })
            .toProperty();
    }

    var ARROW_UP = 38;
    var ARROW_DOWN = 40;
    var ARROW_LEFT = 37;
    var ARROW_RIGHT = 39;

    var keydown = frp
        .fromEvent(document.body, 'keydown')
        .map(_.prop('which'));

    var keyup = frp
        .fromEvent(document.body, 'keyup')
        .map(_.prop('which'));

    var up = keyProperty(ARROW_UP)(keydown, keyup);
    var down = keyProperty(ARROW_DOWN)(keydown, keyup);
    var left = keyProperty(ARROW_LEFT)(keydown, keyup);
    var right = keyProperty(ARROW_RIGHT)(keydown, keyup);

    var xDelta = intervalChange(5, 5)(down, up);
    var yDelta = intervalChange(5, 5)(right, left);

    var x = boundedValue(0, 1000, 0)(xDelta);
    var y = boundedValue(0, 1000, 0)(yDelta);

    var position = coord(x, y);

    var GameView = React.createClass({
        mixins: [KefirConnect(position, 'position')],
        render: function () {
            return h('div', {
                    style: {
                        position: 'absolute',
                        top: this.state.position.x,
                        left: this.state.position.y
                    }
                },
                this.state.position.x + ':' + this.state.position.y
            );
        }
    });

    React.render(
        h(GameView),
        document.getElementById('game')
    );
}(Kefir, R, React, KefirConnect));
