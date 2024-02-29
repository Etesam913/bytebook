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

