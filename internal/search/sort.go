package search

const (
	UserSortFieldCreated = "created"
	UserSortFieldUpdated = "updated"
	UserSortFieldSize    = "size"
)

const (
	SortDirectionAsc  = "asc"
	SortDirectionDesc = "desc"
)

type SearchSortOption struct {
	Field     string
	Direction string
}

func isValidUserSortField(field string) bool {
	switch field {
	case UserSortFieldCreated, UserSortFieldUpdated, UserSortFieldSize:
		return true
	default:
		return false
	}
}

func (s SearchSortOption) ToBleveSortFields() ([]string, bool) {
	var indexField string
	switch s.Field {
	case UserSortFieldCreated:
		indexField = FieldCreatedDate
	case UserSortFieldUpdated:
		indexField = FieldLastUpdated
	case UserSortFieldSize:
		indexField = FieldSize
	default:
		return nil, false
	}

	prefix := "-"
	if s.Direction == SortDirectionAsc {
		prefix = "+"
	}

	return []string{prefix + indexField, "_id"}, true
}
