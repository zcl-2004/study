// 开发文档：https://uniapp.dcloud.io/uniCloud/jql.html#action
module.exports = {
	before: async (state, event) => {
		
	},
	after: async (state, event, error, result) => {
		if (error) {
			throw error
		}
		return result
	}
}
