//
// Create proxy to log all calls to functions a target object.
//
export function logCalls(target: any): any {
    return new Proxy(target, {
        get: (target, prop, receiver) => {
            let value = Reflect.get(target, prop, receiver);
            if (typeof value === "function") {
                //
                // Wrap the function in another function that can log the call.
                //
                return (...args: any[]) => {
                    console.log(`>> ${value.name}(\r\n${args.map(stringify).join(",\r\n")})`);
                    const result = Reflect.apply(value, target, args);                        
                    console.log(`<< Returns: \r\n${JSON.stringify(result, null, 4)}`);
                    return result;
                };
            }
            return value;
        },
    });
}

//
// Convert the incoming value to a string that can be displayed to the user.
//
function stringify(value: any): string {
    if (value === undefined) {
        return "undefined";
    }
    if (typeof value === "function") {
        return "<function>";
    }
    else {
        return JSON.stringify(value, null, 4);
    }
}
