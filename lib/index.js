"use strict";
var jsonpatch = require('fast-json-patch');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var historySchema = new Schema({
    ref: mongoose.Schema.Types.ObjectId,
    patches: [],
    date: {
        type: Date,
        default: Date.now
    }
});
function plugin(schema, options) {
    options = options || {};
    var database = options.database || mongoose;
    schema.post('init', function (next) {
        this.$original = this.toObject();
        next();
    });
    schema.pre('save', function (next) {
        var document = this;
        store.bind(document)().then(function () { return next(); });
    });
    schema.method('history', history);
    schema.method('patch', patch);
    schema.virtual('$history').get(function () {
        return database.model(this.constructor.modelName.toLowerCase() + "-history", historySchema);
    });
    function history() {
        var document = this;
        return {
            store: store.bind(document),
            retrieve: retrieve.bind(document),
            clear: clear.bind(document)
        };
    }
    function store() {
        var patches;
        if (this.isNew) {
            patches = jsonpatch.compare({}, this._doc);
        }
        else {
            patches = jsonpatch.compare(this.$original, this._doc);
        }
        return this
            .$history
            .create({
            ref: this.id,
            patches: patches
        });
    }
    function retrieve() {
        return this
            .$history
            .find({
            ref: this.id
        })
            .exec();
    }
    function clear() {
        return this
            .$history
            .remove({
            ref: this.id
        });
    }
    function patch(patches, save) {
        var result = jsonpatch.apply(this, patches);
        if (result && (save === undefined || save)) {
            this.save();
        }
    }
}
module.exports = plugin;
