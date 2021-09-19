import axios from "axios"

export default class RegistrationForm{
    
    constructor(){
        this._csrf = document.querySelector('[name="_csrf"]').value
        this.form = document.querySelector("#registration-form")
        this.allFields = document.querySelectorAll("#registration-form .form-control")
        this.insertValidationElement()
        this.username = document.querySelector("#username-register")
        this.username.previousValue = ''
        this.email = document.querySelector("#email-register")
        this.email.previousValue = ''
        this.password = document.querySelector("#password-register")
        this.password.previousValue = ''
        this.username.isUnique = false
        this.email.isUnique = false
        this.events()

    }


    //events
    events(){
        this.form.addEventListener("submit", event =>{
            event.preventDefault()
            this.formSubmitHandler()
        })

        this.username.addEventListener("keyup", () => {
            this.isDifferent(this.username, this.usernameHandler)
        })
        
        this.email.addEventListener("keyup", () => {
            this.isDifferent(this.email, this.emailHandler)
        })
        
        this.password.addEventListener("keyup", () => {
            this.isDifferent(this.password, this.passwordHandler)
        })


        this.username.addEventListener("blur", () => {
            this.isDifferent(this.username, this.usernameHandler)
        })
        
        this.email.addEventListener("blur", () => {
            this.isDifferent(this.email, this.emailHandler)
        })
        
        this.password.addEventListener("blur", () => {
            this.isDifferent(this.password, this.passwordHandler)
        })

    }


    // methods

    formSubmitHandler(){
        this.usernameImmediately()
        this.usernameAfterDelay()
        this.emailAfterDelay()
        this.passwordImmediately()
        this.passwordAfterDelay()

        if(
            this.username.isUnique &&
            !this.username.errors &&
            this.email.isUnique &&
            !this.email.errors&&
            !this.password.errors
        ){
            console.log("yes")
            this.form.submit()
        }
    }

    insertValidationElement(){
        this.allFields.forEach(function(element){
            element.insertAdjacentHTML("afterend",'<div class ="alert alert-danger small liveValidateMessage"></div>')
        })
    }

    isDifferent(element, handler){
        if(element.previousValue != element.value){
            handler.call(this)   //// we can write 'handler()' but in this case the (this) key word will not work correctly
        }
        element.previousValue = element.value
    }

    usernameHandler(){
        this.username.errors = false
        this.usernameImmediately()
        clearTimeout(this.username.timer)
        this.username.timer = setTimeout(() => this.usernameAfterDelay(), 800)
    }

    passwordHandler(){
        this.password.errors = false
        this.passwordImmediately()
        clearTimeout(this.password.timer)
        this.password.timer = setTimeout(() => this.passwordAfterDelay(), 800)
    }

    passwordImmediately(){
        if(this.password.value.length > 50){
            this.showValidationError(this.password, "password can not exceed 50 characters.")
        }
        if(!this.password.errors){
            this.hideValidationErrors(this.password)
        }
    }

    passwordAfterDelay(){
        if(this.password.value.length < 12){
            this.showValidationError(this.password, "Password must be at least 12 characters.")
        }
    }

    emailHandler(){
        this.email.errors = false
        clearTimeout(this.email.timer)
        this.email.timer = setTimeout(() => this.emailAfterDelay(this.email), 800)
    }

    emailAfterDelay(){
        if(!/^\S+@\S+$/.test(this.email.value)){
            this.showValidationError(this.email, "You Must Provide a Valid email address")
        }

        if(!this.email.errors){
            axios.post("/doesEmailExist", {_csrf:this._csrf, email: this.email.value}).then((response) => {
                if(response.data){
                    this.email.isUnique = false
                    this.showValidationError(this.email, "this email is already being used")
                }else{
                    this.email.isUnique = true
                    this.hideValidationErrors(this.email)
                }
            }).catch(() => {
                console.log("please try again later.")
            })
        }
    }

    usernameImmediately(){
        if(this.username.value != "" && !/^([a-zA-Z0-9]+)$/.test(this.username.value)){
            this.showValidationError(this.username, "Username Can Only Contain Letters and Numbers")
        }

        if(!this.username.errors){
            this.hideValidationErrors(this.username)
        }

        if(this.username.value.length > 30){
            this.showValidationError(this.username, "username cannot exceed 30 characters.")
        }
        
    }

    showValidationError(element, message){
        element.nextElementSibling.innerHTML = message
        element.nextElementSibling.classList.add("liveValidateMessage--visible")
        element.errors = true
    }
    
    hideValidationErrors(element){
        element.nextElementSibling.classList.remove("liveValidateMessage--visible")
    }

    usernameAfterDelay(){
        if(this.username.value.length < 3){
            this.showValidationError(this.username, "username must be at least 3 charecters.")
        }

        if(this.username.value.length == 0){
            this.showValidationError(this.username, "This Field Can Not Still Empty.")
        }

        if(!this.username.errors){
            axios.post('/doesUsernameExist', {_csrf:this._csrf, username: this.username.value}).then((response) => {
                if(response.data){
                    this.showValidationError(this.username, "That Username is Already Taken")
                    this.username.isUnique = false
                }else{
                    this.username.isUnique = true
                }
            }).catch(() => {
                console.log("please try again later")
            })
        }
    }
}

