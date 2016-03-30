import jsonpatch = require('fast-json-patch');
import mongoose = require('mongoose');
let Schema = mongoose.Schema;

let historySchema = new Schema({
    ref: mongoose.Schema.Types.ObjectId,
    patches: [],
    date: {
        type: Date,
        default: Date.now
    }
});

interface IHistory extends mongoose.Document {
    ref: string;
    patches: any[];
    date: Date;
}

interface Options {
    database?: mongoose.Mongoose;
}

interface IHistoryDocument extends mongoose.Document {
    history(): any;
    $history: mongoose.Model<IHistory>;
    $original: any;
}

function plugin(schema: mongoose.Schema, options: Options) {
    options = options || {};
    let database = options.database || mongoose;

    schema.post('init', function(next) {
        this.$original = this.toObject();
        next();
    });
    schema.pre('save', function(next) {
        var document: IHistoryDocument = this;
        store.bind(document)().then(() => next());
    });

    schema.method('history', history);
    schema.method('patch', patch);
    schema.virtual('$history').get(function():mongoose.Model<IHistory> {
        return database.model<IHistory>(`${this.constructor.modelName.toLowerCase()}-history`, historySchema);
    });

    function history() {
        var document: IHistoryDocument = this;

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
        }else {
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

    function patch(patches:any[], save?:boolean) {
        var result = jsonpatch.apply(this, patches);

        if (result && (save === undefined || save)) {
            this.save();
        }
    }
}
export = plugin;
