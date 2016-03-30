# mongoose-json-patch-history

This plugin saves a history of all changes in the json-patch format

## Installation
```bash
npm install mongoose-json-patch-history --save
```

## Usage
```javascript
const mongoose = require('mongoose');
const history = require('mongoose-json-patch-history');

var schema = mongoose.Schema({
  name: String,
  ...
});

schema.use(history);
```

## API
### document#history()
#### store(): Promise<IHistory>
Stores a new history entry.
Note: This gets called on pre save hook

#### retrieve(): Promise<IHistory[]>
Returns all history entries for this document

#### clear(): Promise<>
Clears the History of this document

### document#patch(patches: [], save?: boolean)
Applies the patches and saves the modified document.

### document#$history: mongoose.Model<IHistory>
The History Collection for the current model

## Options
| Option    | Type               | Default Value                                           | Description   |
|-----------|--------------------|---------------------------------------------------------|---------------|
| database  | [Mongoose Connection](http://mongoosejs.com/docs/api.html#connection_Connection) | `mongoose` | The Database the document should connect to |

## TODO:
 * configurable collection names