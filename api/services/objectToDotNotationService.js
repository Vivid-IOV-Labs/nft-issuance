/**
 * Consume update args object for document and can handle one level nesting.
 * Returns object for leverage by $set in Mongoose update function.
 *
 * @param args
 * @returns {{}}
 */

const objectToDotNotation = (args) => {
  const setObject = {};
  Object.keys(args).forEach((key) => {
    if (typeof args[key] === 'object') {
      Object.keys(args[key]).forEach((subkey) => {
        setObject[`${key}.${subkey}`] = args[key][subkey];
      });
    } else {
      setObject[key] = args[key];
    }
  });
  return setObject;
};

module.exports = objectToDotNotation;
