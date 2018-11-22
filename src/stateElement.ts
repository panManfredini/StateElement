
// State Manager element
export enum stateBehaviour{
    NORMAL = 'NORMAL',       // has an associated event for data binding
    READONLY = 'READONLY',   // will not have data binding
}

var _isCallback_locked = false;
const _transitions_callbackMap :  Map<Map<object,Function>,any> = new Map();


export class StateTransition {
    name : string;
    callbackMap : Map<object,Function> ;
    usrDefined_transition: Function;

    constructor(NAME:string){
        this.name = NAME;
        this.callbackMap = new Map();
        this.usrDefined_transition = undefined;

        if(typeof(this.name) !== "string") throw Error("Variable name must be a string.");
    }

    lock_callbacks(event:CustomEvent){
        if(_isCallback_locked) {
            console.log('The following target has dispatched a '+ this.name +' event during a UI update callback:');
            console.log(event.target);
            throw Error('Forbidden multiple-update during an update callback loop.');
        } 
        else  _isCallback_locked = true;
    }

    unlock_callbacks(){
        _isCallback_locked = false;
    }

    updateHandler( event:CustomEvent) :void {

        console.log('Handling event UPDATE from stateTransition: '+this.name);
        this.lock_callbacks(event);

        this.usrDefined_transition(event);

        // loop over watchers callbacks
        for( let update_callback of this.callbackMap.values()){
                update_callback(event.detail); 
        }

        // loop over automatically added callbacks to _transitions_callbackMap
        for( let [map,val] of _transitions_callbackMap){  
            for (let upd_callback of map.values()){
                upd_callback(val);
            }
        }
        _transitions_callbackMap.clear();
        this.unlock_callbacks();
    }

    watchHanlder( event:CustomEvent) :void {
        //console.log('Adding element to watchlist of: '+this.name);

        // add element to the watcher list
        this.callbackMap.set(event.target, event.detail.update);
    }

    detachHanlder( event:CustomEvent) :void {
        //console.log('Removing element from watchlist of: '+this.name);

        // remove element from watcher list
        this.callbackMap.delete(event.target);
    }

}

export class StateVariable extends StateTransition{
    type : string;
    default_val : any ;
    behaviour : stateBehaviour;
    _err_on_value :string;

    constructor(NAME:string, TYPE:string, DEFAULT:any){   // FIXME DEFAULT HAS A TYPE OF TYPE
        super(NAME);
        this.type = TYPE;
        this.behaviour = stateBehaviour.NORMAL;
        this.default_val = DEFAULT;
        this._err_on_value = 'Wrong type assignment to state variable: ' + this.name;

        // Sanity checks
        let white_list_types = ["string", "object", "number", "boolean"];
        if(typeof(TYPE) !== "string")        throw Error("StateVariable type must be a string.");
        if(!white_list_types.includes(TYPE)) throw Error(this._err_on_value);

        // set localstorage variable if none
        if(localStorage.getItem(this.name) === null) 
            this.value = this.default_val;
    }

    setBehaviour(behave_as:stateBehaviour){
        this.behaviour = behave_as;
    }

    set value(val:any){
        let push_var = val;
        
        if( typeof(val) === this.type ) {
            if(this.type !== 'string')  push_var = JSON.stringify(val);
            localStorage.setItem(this.name, push_var);
        }
        else throw Error(this._err_on_value); 
    }

    get value():any{
        
        let return_val = localStorage.getItem(this.name);
        if(this.type !== 'string'){
            return_val = JSON.parse(return_val);
            if(typeof(return_val) !== this.type ) 
                throw Error("State variable: "+this.name+" is corrupted, returns type "+typeof(return_val) +" expecting "+ this.type);
        }
        return return_val;
    }
    
    set auto_value(val:any){
        this.value = val;
        _transitions_callbackMap.set(this.callbackMap, val);
    }

    updateHandler( event:CustomEvent) :void {

        console.log('Handling event UPDATE from state variable: '+this.name);
        this.lock_callbacks(event);
               
        this.value = event.detail.value;
    
        // loop over watchers callbacks
        for( let update_callback of this.callbackMap.values()){
                update_callback(event.detail.value); 
        }
        
        this.unlock_callbacks();
    }
    

}

export class Message extends StateTransition{
    updateHandler( event:CustomEvent) :void {

        console.log('Handling event MESSAGE from message: '+this.name);
        // (_statewatchdog >= 10000) ? _statewatchdog = 0 :  _statewatchdog++;
        
        /// let sanity_check = _statewatchdog;
        // loop over watchers callbacks
        for( let message_callback of this.callbackMap.values()){
                message_callback(event.detail); 
        }
        // if(sanity_check !== _statewatchdog) throw Error('State variables update is forbidden within a data update callback.');

    }
}


// FIXME: 
// - this will fail in comunication with state enhanced custom elements
//   in the case each view manage its state, a CE can be then defined previously 
//   in another view and is re-used in the current view loaded lazily

export class stateElement extends HTMLElement{

    stateList: Array<StateVariable>;
    transitionsList: Array<string>;

    constructor(){
        super();

        this.stateList = [];
        this.transitionsList = [];
    }

    connectedCallback(){
        
        // adding basic event listeners for state variables with data binding
        for (let state of this.stateList) {

            if( state.behaviour === stateBehaviour.NORMAL){
              //console.log('adding event listeners: ', 'UPDATE-' + state.name ) ;
              this.addEventListener('UPDATE-' + state.name, state.updateHandler.bind(state) );
              //console.log('adding event listeners: ', 'WATCH-' + state.name ) ;
              this.addEventListener('WATCH-' + state.name, state.watchHanlder.bind(state) );
              //console.log('adding event listeners: ', 'DETACH-' + state.name ) ;
              this.addEventListener('DETACH-' + state.name, state.detachHanlder.bind(state) );
            }
        }
    }

}



// mixin to be applied to a web-component
// FIXME: 
//  - getter and setters error handling with JSON parsing
//  - solve the fact that we don't know type of state if pass only string, maybe pass a tuple
//  - add a check if the WATCH event has been caught, so send an error if StateManager defined after custom element
//  - Problem: maybe I just want access to the stateVariable but don't want to watch.
//  - make test machinery

export let statesMixin = (baseClass:any, listOfStates:Array<string>) => class extends baseClass {

    constructor(){
        super();
        this._addGetterSetters();
    }

    _addGetterSetters():void{
        for( let state of listOfStates){
            
            //console.log('adding getter and setters for: ', state);

            Object.defineProperty(this, state, {
                set: (val) => { 
                    //console.log('dispatching UPDATE-'+state+' with value: ', val);
                    let event = new CustomEvent('UPDATE-'+state, { bubbles:true, detail:{'value':val} }); 
                    this.dispatchEvent(event);
                },
                get: () => { return JSON.parse(localStorage.getItem(state)); }
            });    
        }
    }
        
    connectedCallback(){
        //console.log('Im connected, running connected callback');
        if(super['connectedCallback'] !== undefined) {
            super.connectedCallback();
        }
        // watch default state variables
        for (let state of listOfStates) {
            let update = this['on_update_'+state].bind(this);
            let event = new CustomEvent('WATCH-'+state, { bubbles:true, detail:{'update':update} });
            //console.log('----> dispatching event: ', 'WATCH-'+state);
            this.dispatchEvent(event);
        }
    }
}