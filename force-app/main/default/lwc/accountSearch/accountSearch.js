import { LightningElement, track, wire } from 'lwc';
import getAccTypes from '@salesforce/apex/AccDataSvc.getAccTypes';
import getAccounts from '@salesforce/apex/AccDataSvc.getAccounts';
import { updateRecord, getRecordNotifyChange } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const COLUMNS = [
    { label: 'Name', fieldName: 'Name', type: 'text', editable: true },
    { label: 'Type', fieldName: 'Type', type: 'text' }
];
const SUCCESS_TITLE = 'Success';
const SUCCESS_MSG = 'Record Updates Succeeded!';
const SUCCES_VARIANT = 'success';
const ERROR_TITLE = 'Error';
const ERROR_VARIANT = 'error';

export default class AccountSearch extends LightningElement {
    
    selectedTypeLabel = '';
    @track typeOptions;
    @track accounts;
    columns = COLUMNS;

    isLoading = false; 
    error = undefined;    
    draftValues = [];

    @wire(getAccTypes)
    accTypes({error, data}){
        if(data){
            this.error = undefined;
            this.typeOptions = data.map(type => {
                return { label: type, value: type.replace(/ /g, '_')}
            });
            this.typeOptions.unshift({ label: 'All Types', value: ''});            
        }
        else if(error){
            this.typeOptions = undefined;
            this.error = error;
        }
    }

    @wire(getAccounts, {accType: '$selectedTypeLabel'})
    wiredAccounts(result){
        this.accounts = result;
    }

    handleTypeChange(event){
        this.isLoading = true;
        this.selectedTypeLabel = event.detail.value ? event.detail.value.replace(/_/g, ' '): '';
        this.isLoading = false;
    }
    
    async handleSave(event){
        const updatedFields = event.detail.draftValues;
        // Prepare the record IDs for getRecordNotifyChange()
        const notifyChangeIds = updatedFields.map(row => { return { "recordId": row.Id } });
        console.log(notifyChangeIds,' : notifyChangeIds');
    
        const recordInputs = event.detail.draftValues.slice().map(draft => {
            const fields = Object.assign({}, draft);
            return {fields};
        });
        const promises = recordInputs.map(recordInput => updateRecord(recordInput));
        Promise.all(promises).then(() => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: SUCCESS_TITLE, 
                    message: SUCCESS_MSG, 
                    variant: SUCCES_VARIANT
                })
            );
            console.log(notifyChangeIds,' : notifyChangeIds');

            getRecordNotifyChange(notifyChangeIds);
            // Display fresh data in the datatable
            refreshApex(this.accounts);
            // Clear all draft values in the datatable also hides the save and cancel button
            this.draftValues = [];      
        })
        .catch(error =>{
            console.log('error: ',error);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: ERROR_TITLE, 
                    message: error.body.message, 
                    variant: ERROR_VARIANT
                })
            );
        });
    }  
}