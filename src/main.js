require.config({
    paths: {
        aura: 'components/aura',
        jquery: 'components/jquery/jquery',
        underscore: 'components/underscore/underscore'
    }
});

require(['aura/aura'], function (Aura) {
    var app = new Aura();

    app.use('extensions/storage');

    app.start({ widgets: 'body' });
});