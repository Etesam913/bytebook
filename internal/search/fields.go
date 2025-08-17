package search

// Field names for search index documents

const (
	FieldType                  = "type"
	FieldFolder                = "folder"
	FieldFileName              = "file_name"
	FieldFileNameLC            = "file_name_lc"
	FieldFileExtension         = "file_extension"
	FieldTextContent           = "text_content"
	FieldTextContentNgram      = "text_content_ngram"
	FieldCodeContent           = "code_content"
	FieldGoCodeContent         = "go_code_content"
	FieldJavaCodeContent       = "java_code_content"
	FieldPythonCodeContent     = "python_code_content"
	FieldJavascriptCodeContent = "javascript_code_content"
	FieldHasDrawing            = "has_drawing"
	FieldHasCode               = "has_code"
	FieldHasGoCode             = "has_go_code"
	FieldHasJavaCode           = "has_java_code"
	FieldHasPythonCode         = "has_python_code"
	FieldHasJavascriptCode     = "has_javascript_code"
	FieldTags                  = "tags"
	FieldLastUpdated           = "last_updated"
	FieldCreatedDate           = "created_date"
)

var NGramAnalyzer = "custom_ngram"
var NGramTokenFilter = "n-gram"
