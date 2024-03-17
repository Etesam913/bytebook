export namespace git_helpers {
	
	export class GitReponse {
	    status: string;
	    message: string;
	    error: any;
	
	    static createFrom(source: any = {}) {
	        return new GitReponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.status = source["status"];
	        this.message = source["message"];
	        this.error = source["error"];
	    }
	}

}

export namespace project_types {
	
	export class SuccessHandler {
	    success: boolean;
	    message: string;
	    internalMessage: string;
	
	    static createFrom(source: any = {}) {
	        return new SuccessHandler(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.message = source["message"];
	        this.internalMessage = source["internalMessage"];
	    }
	}

}

