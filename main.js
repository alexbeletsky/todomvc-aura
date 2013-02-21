require.config({
    paths: {
        aura: './components/aura'
    }
});

require(['aura/aura'], function (Aura) {
    var app = new Aura();
    app.start({ widgets: 'body' });
});