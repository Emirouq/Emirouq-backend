const { Schema, model } = require("mongoose");

/* if i created sub category as Car , then say attribute is Brand 
    then that attribute uuid will be linked to attributeId , and value will be Honda , BMW etc , in this case no parent attribute is needed
 
    now, if i enter Honda cars or bmw cars, then it will save the the cars name in values with ,the parent attribute Id,

    so that when i select brand as honda, it will show me all the models of honda only
*/

const attributeOptionSchema = new Schema({
  uuid: { type: String, required: true, unique: true },
  //if the attribute is dependent on another attribute, e.g., model depends on make
  attributeId: { type: String, required: true, ref: "Attribute" }, // e.g. "make", "model"
  value: { type: String, required: true }, // e.g. "Honda", "Civic"
  parentAttribute: { type: String }, // e.g. "honda","bmw"
});

attributeOptionSchema.index({ attributeId: 1 });
attributeOptionSchema.index({ attributeId: 1, value: 1 }, { unique: true });
attributeOptionSchema.index(
  { attributeId: 1, parentAttribute: 1 },
  { partialFilterExpression: { parentAttribute: { $exists: true } } }
);

const AttributeOption = model(
  "AttributeOption",
  attributeOptionSchema,
  "attributeOptions"
);

module.exports = AttributeOption;
