import {StateVariable} from '../build/stateElement.js';

export default function (){
    // this is a must ;)
    localStorage.clear();

    describe("StateVariable Test:",()=>{
        describe("Instantiation",()=>{
            
            it("Instantiated to the store,proper name and initial value",()=>{
                let test_string =  new StateVariable("test_string","ciao");
                let test_number =  new StateVariable("test_number", 7);
                let test_object =  new StateVariable("test_object",{ciao:"bella", hey:67, poz:["cool", 9]});
                let test_bool   =  new StateVariable("test_bool",true);
                
                chai.assert.equal(localStorage.getItem('test_string'), 'ciao', "string not in local storage" );
                chai.assert.equal(localStorage.getItem('test_number'), '7', "number not in local storage" );
                chai.assert.equal(localStorage.getItem('test_object'), JSON.stringify({ciao:"bella", hey:67, poz:["cool", 9]}), "object not in local storage" );
                chai.assert.equal(localStorage.getItem('test_bool'), 'true', "bool not in local storage" );
            });

            it("If exist do not overide",()=>{
                let test_string2 =  new StateVariable("test_string","ciao2");
                let test_number2 =  new StateVariable("test_number", 14);
                let test_object2 =  new StateVariable("test_object",{ciao:"bella2", hey:67, poz:["cool", 9]});
                let test_bool2   =  new StateVariable("test_bool",false);
                chai.assert.equal(localStorage.getItem('test_string'), 'ciao', "string overridden" );
                chai.assert.equal(localStorage.getItem('test_number'), '7', "number overridden" );
                chai.assert.equal(localStorage.getItem('test_object'), JSON.stringify({ciao:"bella", hey:67, poz:["cool", 9]}), "object overridden" );
                chai.assert.equal(localStorage.getItem('test_bool'), 'true', "bool overridden" );
            });


            it("throws for wrong init type",()=>{
                let pollo;
                let test_function = () =>{console.log("ciao"); };
                let test_function2 = () =>{let a = new StateVariable("test_function",test_function); };
                let test_function3 = () =>{let a = new StateVariable("test_function", pollo); };

                chai.assert.Throw(test_function2,"Wrong type assignment to state variable");
                chai.assert.Throw(test_function3, "Wrong type assignment to state variable");
            });
        });
        
        describe('Input Output',()=>{
    
            it("Getter and Setters return proper value and type.",()=>{
                let test_string =  new StateVariable("test_string","ciao");
                let test_number =  new StateVariable("test_number", 7);
                let test_object =  new StateVariable("test_object",{ciao:"bella", hey:67, poz:["cool", 9]});
                let test_bool   =  new StateVariable("test_bool",true);
                test_string.value = "pelam123";
                test_number.value = 9;
                test_object.value = {bim:"bum",bam:8, poz:[6,7]};
                test_object.value.poz.push(8);
                test_bool.value = false;
                
                document.test_object = test_object;

                chai.assert.equal(test_string.value, "pelam123", "String " );
                chai.assert.equal(test_number.value, 9 , "Number " );
                chai.assert.deepEqual(test_object.value,{bim:"bum",bam:8, poz:[6,7,8]}  , "object " );
                chai.assert.equal(test_bool.value,false , "boolean " );
            });
            
            it("Throws when corrupted, also additional throw test of setter",()=>{
                // only number bool and object can be corrupted, strings cant because of performance cut on JSON parse
                // Also the throw of set function has been tested already in the init (few more here)
                let test_object =  new StateVariable("test_object",{ciao:"bella", hey:67, poz:["cool", 9]});
                let test_bool   =  new StateVariable("test_bool",true);
                let test_number =  new StateVariable("test_number",7);

                let test_function = () =>{ test_object.value = "fuck";};
                let test_function2 = () =>{ test_bool.value = 89;};
                let test_function3 = () =>{ test_number.value = undefined;};

                chai.assert.Throw(test_function, "Wrong type assignment to state variable");
                chai.assert.Throw(test_function2,"Wrong type assignment to state variable");
                chai.assert.Throw(test_function3, "Wrong type assignment to state variable");

                  
                // THIS sadly doesn't work anymore for the "get" of value but only for new init, 
                // but reading from memory gives enough performance improvement that I can leave 
                // this behind.
                localStorage.setItem("test_object",'\"ciao\"');
                localStorage.setItem("test_bool",'\"ciao\"');
                localStorage.setItem("test_number",'\"ciao\"');
                let test_function4 = () =>{ let ciao = new StateVariable("test_object",{ciao:"bella", hey:67, poz:["cool", 9]});};
                let test_function5 = () =>{ let ciao = new StateVariable("test_bool",true);};
                let test_function6 = () =>{ let ciao =  new StateVariable("test_number",7);};
                
                chai.assert.Throw(test_function4, "corrupted");
                chai.assert.Throw(test_function5, "corrupted");
                chai.assert.Throw(test_function6, "corrupted");
                localStorage.clear();
                
            });

        });
        
        describe('Update Watchers',()=>{
            
            it('It locks',()=>{
                let test_string =  new StateVariable("test_string","ciao");
                let test_number =  new StateVariable("test_number", 7);
                let double_mod = ()=>{ test_number.value = 8; test_number.updateWatchers() };
                test_string.callbackMap.set(document.body, double_mod);

                let throw_lock = ()=>{ test_string.updateWatchers()};

                chai.assert.Throw(throw_lock, "Forbidden multiple-update");
            });

            it('It updates data and call watchers only once and unlocks',()=>{
                let test_string =  new StateVariable("test_string","ciao");
                let test_number =  new StateVariable("test_number", 7);
                let test_object =  new StateVariable("test_object",{ciao:"bella", hey:67, poz:["cool", 9]});
                let test_bool   =  new StateVariable("test_bool",true);
                
                test_string.value = "hey";
                test_number.value = 123;
                test_object.value = {bla:67, ca:"ca"};
                test_bool.value = false;

                let counter = 0;
                let counter_func = ()=>{ counter++; };
                test_string.callbackMap.set(document.body, counter_func);
                test_number.callbackMap.set(document.body, counter_func);
                test_object.callbackMap.set(document.body, counter_func);
                test_bool.callbackMap.set(document.body, counter_func);
                
                test_string._val = "qwerty";
                test_bool._val = true;
                test_object._val = {a:1, b:2};
                test_number._val = 321;

                test_string.updateWatchers();
                chai.assert.equal(localStorage.getItem('test_string'),"qwerty", "String " );
                chai.assert.equal(counter,1,"Called once ");
                test_number.updateWatchers();
                chai.assert.equal(localStorage.getItem('test_number'),"321", "number " );
                chai.assert.equal(counter,2,"Called once ");
                test_object.updateWatchers();
                chai.assert.deepEqual(localStorage.getItem('test_object'),"{\"a\":1,\"b\":2}" , "Object " );
                chai.assert.equal(counter,3,"Called once ");
                test_bool.updateWatchers();
                chai.assert.equal(localStorage.getItem('test_bool'),"true", "bool " );
                chai.assert.equal(counter,4,"Called once ");
            });
        });

    });
}