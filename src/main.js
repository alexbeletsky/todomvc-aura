require.config({
    paths: {
        components: 'components',
        aura: 'components/aura',
        underscore: 'components/underscore/underscore'
    }
});

require(['aura/aura'], function (Aura) {
    var app = new Aura();
    app.start({ widgets: 'body' });
});