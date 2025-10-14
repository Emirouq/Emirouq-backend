const { Schema, model } = require("mongoose");

/* if i created sub category as Car , then say attribute is Brand 
    then that attribute uuid will be linked to attributeId , and value will be Honda , BMW etc , in this case no parent attribute is needed
 
    now, if i enter Honda cars or bmw cars, then it will save the the cars name in values with ,the parent attribute Id,

    so that when i select brand as honda, it will show me all the models of honda only
*/

const attributeOptionSchema = new Schema({
  uuid: { type: String, required: true, unique: true },
  // this id refers to brand, model , year etc , for which these options are
  attributeId: { type: String, required: true, ref: "Attribute" }, // e.g. "brand", "model" uuid
  value: { type: String, required: true, trim: true }, // e.g. "Honda", "Civic" , Bmw , M8 M4
  parentId: { type: String }, // e.g. UUID of the parent attribute, eg: bmw uuid
  parentValue: { type: String, trim: true }, // e.g. bmw
});

attributeOptionSchema.index({ attributeId: 1 });
attributeOptionSchema.index({ attributeId: 1, value: 1 });
attributeOptionSchema.index(
  { attributeId: 1, parentId: 1, parentValue: 1 },
  { partialFilterExpression: { parentId: { $exists: true } } }
);

const AttributeOption = model(
  "AttributeOption",
  attributeOptionSchema,
  "attributeOptions"
);

module.exports = AttributeOption;
