require.config({
    baseUrl: '../',
    paths: {
        components: 'components',
        aura: 'components/aura',
        jquery: 'components/jquery/jquery',
        underscore: 'components/underscore/underscore'
    }
});

require(['aura/aura', 'jquery'], function (Aura, $) {
    debugger;
});