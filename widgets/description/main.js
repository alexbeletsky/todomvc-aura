define(function () {
    return {
        template: 
            '<header id="header">\
                <h1>todos</h1>\
                <input id="new-todo" placeholder="What needs to be done?" autofocus>\
            </header>',

        initialize: function () {
            this.$el.html(this.template);
        }
    }
});