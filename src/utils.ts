import * as _ from 'lodash';

export class Utils {
    /**
     * Splits array in 'batches'
     */
    public static chunkArray(myArray: any[], chunk_size: number) {
        var results = [];
        
        while (myArray.length) {
            results.push(myArray.splice(0, chunk_size));
        }
        
        return results;
    }

    public static diffObjectDeep(object: any, base: any): object {
        function diffObject(object: any, base: any): object {
            return _.transform(object, function(result, value, key) {
                if (!_.isEqual(value, base[key])) {
                    result[key] = (_.isObject(value) && _.isObject(base[key])) 
                                    ? diffObject(value, base[key]) 
                                    : value;
                }
            });
        }

        return diffObject(object, base);
    }
}
